import { fetchReader } from '../source/zonatmo';
import { readerCacheKey } from '../storage/cacheKeys';
import { forgetRemoteCache } from '../storage/remoteCache';
import { forgetPageProgress } from '../storage/readerProgress';
import type { ReaderData } from '../source/zonatmo';
import {
  deleteChapterFiles,
  downloadPageWithRetry,
  hasDownloadFiles,
  pageFile,
  prepareChapterDirectory,
  readDownloadFile,
  reconcileDirectories,
  writeDownloadFile,
} from './files';
import { loadDownloadIndex, removeRecord, upsertRecord } from './metadata';
import { chapterDirNames } from './paths';
import { createRunTracker } from './runState';
import {
  getDownloadState,
  getVersion,
  notify,
  store,
  subscribe,
} from './store';
import { withTimeout } from './timeout';
import type { DownloadInput, DownloadRecord } from './types';

export { subscribe, getVersion, getDownloadState };

const MAX_PARALLEL_PAGES = 3;
const runs = createRunTracker();

export async function loadDownloadedReader(
  chapterPath: string,
): Promise<ReaderData | null> {
  const file = await readDownloadFile(chapterPath);

  return file?.data ?? null;
}

export async function enqueueDownload(input: DownloadInput) {
  const chapterPath = input.chapterPath;
  const current = store.states.get(chapterPath);

  if (store.records.has(chapterPath)) {
    return;
  }

  if (current && current.status !== 'failed') {
    return;
  }

  store.states.set(chapterPath, { status: 'queued', page: 0, total: 0 });
  notify();

  // The index may still be loading, so wait before deciding the chapter is new.
  await initializeDownloads();

  // Cancelling or deleting while the index loaded must win.
  if (store.states.get(chapterPath)?.status !== 'queued') {
    return;
  }

  if (store.records.has(chapterPath)) {
    store.states.delete(chapterPath);
    notify();
    return;
  }

  store.queue.push(input);
  void pump();
}

export function cancelDownload(chapterPath: string) {
  const state = store.states.get(chapterPath);

  if (!state) {
    return;
  }

  if (state.status === 'queued') {
    const index = store.queue.findIndex((item) => item.chapterPath === chapterPath);

    if (index >= 0) {
      store.queue.splice(index, 1);
    }

    store.states.delete(chapterPath);
    notify();
    return;
  }

  if (state.status === 'downloading') {
    runs.cancel(chapterPath);
    store.controllers.get(chapterPath)?.abort();
    store.states.delete(chapterPath);
    notify();
  }
}

export async function deleteDownload(chapterPath: string) {
  const controller = store.controllers.get(chapterPath);

  if (controller) {
    runs.cancel(chapterPath);
    controller.abort();
  }

  const index = store.queue.findIndex((item) => item.chapterPath === chapterPath);

  if (index >= 0) {
    store.queue.splice(index, 1);
  }

  store.states.delete(chapterPath);
  const deleted = deleteChapterFiles(chapterPath);
  forgetRemoteCache(readerCacheKey(chapterPath));
  void forgetPageProgress(chapterPath);

  if (!deleted && hasDownloadFiles(chapterPath)) {
    // The files survived (collision or unreadable marker); keeping the index
    // entry prevents reconcileDirectories from resurrecting them as unknown.
    // The record stays in memory too, so the UI agrees with the index.
    notify();
    return;
  }

  store.records.delete(chapterPath);
  notify();

  await initializeDownloads();

  // Initialization may have recovered the index entry before the files were
  // gone, so remove it again after the scan.
  store.records.delete(chapterPath);
  await removeRecord(chapterPath);
  notify();
}

export function initializeDownloads(): Promise<void> {
  if (store.initialized) {
    return Promise.resolve();
  }

  if (store.initializing) {
    return store.initializing;
  }

  store.initializing = (async () => {
    try {
      const stored = await loadDownloadIndex();
      const valid: DownloadRecord[] = [];

      for (const record of stored) {
        if (hasDownloadFiles(record.chapterPath)) {
          store.records.set(record.chapterPath, record);
          valid.push(record);
        } else {
          await removeRecord(record.chapterPath);
        }
      }

      const knownDirs = new Set(
        valid.flatMap((record) => chapterDirNames(record.chapterPath)),
      );
      const recovered = await reconcileDirectories(knownDirs).catch(() => []);

      for (const record of recovered) {
        store.records.set(record.chapterPath, record);
        await upsertRecord(record);
      }
    } catch {
      // Downloads remain usable per chapter even if the index is unreadable.
    } finally {
      store.initialized = true;
      notify();
    }
  })();

  return store.initializing;
}

async function pump() {
  if (store.running) {
    return;
  }

  store.running = true;

  try {
    while (store.queue.length > 0) {
      const input = store.queue.shift();

      if (!input) {
        break;
      }

      await runDownload(input);
    }
  } finally {
    store.running = false;
  }
}

async function runDownload(input: DownloadInput) {
  const chapterPath = input.chapterPath;
  const generation = runs.start(chapterPath);
  const controller = new AbortController();
  store.controllers.set(chapterPath, controller);
  store.states.set(chapterPath, { status: 'downloading', page: 0, total: 0 });
  notify();

  try {
    const data = await withTimeout(controller, 15_000, () => fetchReader(chapterPath, controller.signal));

    if (!runs.isCurrent(chapterPath, generation)) {
      throw new Error('stale');
    }

    const pages = data.pages.filter((url) => url.length > 0);
    const total = pages.length;

    if (total === 0) {
      throw new Error('no pages');
    }

    const directory = prepareChapterDirectory(chapterPath);
    const localPages: string[] = [];
    let completed = 0;
    let cursor = 0;

    store.states.set(chapterPath, { status: 'downloading', page: 0, total });
    notify();

    const worker = async () => {
      while (cursor < total) {
        if (controller.signal.aborted || !runs.canWrite(chapterPath, generation)) {
          throw new Error('aborted');
        }

        const index = cursor;
        cursor += 1;
        const url = pages[index];

        if (!url) {
          continue;
        }

        const file = pageFile(directory, index, url);
        await downloadPageWithRetry(url, file, controller);

        if (!runs.canWrite(chapterPath, generation)) {
          throw new Error('stale');
        }

        localPages[index] = file.uri;
        completed += 1;
        store.states.set(chapterPath, {
          status: 'downloading',
          page: completed,
          total,
        });
        notify();
      }
    };

    const workers = Array.from({ length: Math.min(MAX_PARALLEL_PAGES, total) }, () => worker());

    await Promise.all(workers).catch(async (error) => {
      runs.fail(chapterPath);
      controller.abort();
      await Promise.allSettled(workers);
      throw error;
    });

    if (controller.signal.aborted || !runs.isCurrent(chapterPath, generation)) {
      throw new Error('aborted');
    }

    if (completed !== total || localPages.length !== total) {
      throw new Error('incomplete');
    }

    const record: DownloadRecord = { ...input, pageCount: total, completedAt: Date.now() };

    await writeDownloadFile(directory, {
      version: 1,
      record,
      data: { ...data, pages: localPages },
    });

    if (!runs.isCurrent(chapterPath, generation)) {
      runs.consumeCancel(chapterPath);
      deleteChapterFiles(chapterPath);
      return;
    }

    await upsertRecord(record);

    if (!runs.isCurrent(chapterPath, generation)) {
      runs.consumeCancel(chapterPath);
      await removeRecord(chapterPath);
      deleteChapterFiles(chapterPath);
      return;
    }

    store.records.set(chapterPath, record);
    store.states.delete(chapterPath);
    forgetRemoteCache(readerCacheKey(chapterPath));
    notify();
  } catch (error) {
    settleFailed(chapterPath, generation, error);
  } finally {
    releaseDownload(chapterPath, generation, controller);
  }
}

/** Failure and cancellation both land here: a stale run only cleans up files. */
function settleFailed(
  chapterPath: string,
  generation: number,
  error: unknown,
): void {
  const wasCancelled = runs.consumeCancel(chapterPath);

  if (!runs.isCurrent(chapterPath, generation)) {
    if (wasCancelled) {
      deleteChapterFiles(chapterPath);
    }

    return;
  }

  // Log real failures (fetch, write, JSON) so "failed" is diagnosable.
  console.warn(`[downloads] ${chapterPath}:`, error);

  deleteChapterFiles(chapterPath);

  if (wasCancelled) {
    store.states.delete(chapterPath);
  } else {
    store.states.set(chapterPath, { status: 'failed', page: 0, total: 0 });
  }

  notify();
}

function releaseDownload(
  chapterPath: string,
  generation: number,
  controller: AbortController,
): void {
  if (store.controllers.get(chapterPath) === controller) {
    store.controllers.delete(chapterPath);
  }

  runs.finish(chapterPath, generation);
}
