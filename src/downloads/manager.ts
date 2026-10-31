import { fetchReader } from '../source/zonatmo';
import { readerCacheKey } from '../storage/cacheKeys';
import { forgetRemoteCache } from '../storage/remoteCache';
import { forgetPageProgress } from '../storage/readerProgress';
import type { ReaderData } from '../source/zonatmo';
import {
  deleteChapterFiles,
  downloadPage,
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
import { withTimeout } from './timeout';
import type {
  DownloadInput,
  DownloadRecord,
  DownloadState,
} from './types';

const MAX_PARALLEL_PAGES = 3;

const states = new Map<string, DownloadState>();
const records = new Map<string, DownloadRecord>();
const controllers = new Map<string, AbortController>();
const runs = createRunTracker();
const queue: DownloadInput[] = [];
const listeners = new Set<() => void>();

let version = 0;
let running = false;
let initialized = false;
let initializing: Promise<void> | null = null;

function notify() {
  version += 1;

  for (const listener of listeners) {
    listener();
  }
}

export function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function getVersion() {
  return version;
}

export function getDownloadState(
  chapterPath: string,
): DownloadState | undefined {
  const state = states.get(chapterPath);

  if (state) {
    return state;
  }

  const record = records.get(chapterPath);

  return record
    ? { status: 'done', page: record.pageCount, total: record.pageCount }
    : undefined;
}

export async function loadDownloadedReader(
  chapterPath: string,
): Promise<ReaderData | null> {
  const file = await readDownloadFile(chapterPath);

  return file?.data ?? null;
}

export async function enqueueDownload(input: DownloadInput) {
  const chapterPath = input.chapterPath;
  const current = states.get(chapterPath);

  if (records.has(chapterPath)) {
    return;
  }

  if (current && current.status !== 'failed') {
    return;
  }

  states.set(chapterPath, { status: 'queued', page: 0, total: 0 });
  notify();

  // The index may still be loading, so wait before deciding the chapter is new.
  await initializeDownloads();

  // Cancelling or deleting while the index loaded must win.
  if (states.get(chapterPath)?.status !== 'queued') {
    return;
  }

  if (records.has(chapterPath)) {
    states.delete(chapterPath);
    notify();
    return;
  }

  queue.push(input);
  void pump();
}

export function cancelDownload(chapterPath: string) {
  const state = states.get(chapterPath);

  if (!state) {
    return;
  }

  if (state.status === 'queued') {
    const index = queue.findIndex((item) => item.chapterPath === chapterPath);

    if (index >= 0) {
      queue.splice(index, 1);
    }

    states.delete(chapterPath);
    notify();
    return;
  }

  if (state.status === 'downloading') {
    runs.cancel(chapterPath);
    controllers.get(chapterPath)?.abort();
    states.delete(chapterPath);
    notify();
  }
}

export async function deleteDownload(chapterPath: string) {
  const controller = controllers.get(chapterPath);

  if (controller) {
    runs.cancel(chapterPath);
    controller.abort();
  }

  const index = queue.findIndex((item) => item.chapterPath === chapterPath);

  if (index >= 0) {
    queue.splice(index, 1);
  }

  states.delete(chapterPath);
  records.delete(chapterPath);
  const deleted = deleteChapterFiles(chapterPath);
  forgetRemoteCache(readerCacheKey(chapterPath));
  void forgetPageProgress(chapterPath);
  notify();

  if (!deleted && hasDownloadFiles(chapterPath)) {
    // The files survived (collision or unreadable marker); keeping the index
    // entry prevents reconcileDirectories from resurrecting them as unknown.
    return;
  }

  await initializeDownloads();

  // Initialization may have recovered the index entry before the files were
  // gone, so remove it again after the scan.
  records.delete(chapterPath);
  await removeRecord(chapterPath);
  notify();
}

export function initializeDownloads(): Promise<void> {
  if (initialized) {
    return Promise.resolve();
  }

  if (initializing) {
    return initializing;
  }

  initializing = (async () => {
    try {
      const stored = await loadDownloadIndex();
      const valid: DownloadRecord[] = [];

      for (const record of stored) {
        if (hasDownloadFiles(record.chapterPath)) {
          records.set(record.chapterPath, record);
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
        records.set(record.chapterPath, record);
        await upsertRecord(record);
      }
    } catch {
      // Downloads remain usable per chapter even if the index is unreadable.
    } finally {
      initialized = true;
      notify();
    }
  })();

  return initializing;
}

async function pump() {
  if (running) {
    return;
  }

  running = true;

  try {
    while (queue.length > 0) {
      const input = queue.shift();

      if (!input) {
        break;
      }

      await runDownload(input);
    }
  } finally {
    running = false;
  }
}

async function runDownload(input: DownloadInput) {
  const chapterPath = input.chapterPath;
  const generation = runs.start(chapterPath);
  const controller = new AbortController();
  controllers.set(chapterPath, controller);
  states.set(chapterPath, { status: 'downloading', page: 0, total: 0 });
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

    states.set(chapterPath, { status: 'downloading', page: 0, total });
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
        await withTimeout(controller, 30_000, () => downloadPage(url, file, controller.signal));

        if (!runs.canWrite(chapterPath, generation)) {
          throw new Error('stale');
        }

        localPages[index] = file.uri;
        completed += 1;
        states.set(chapterPath, {
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

    records.set(chapterPath, record);
    states.delete(chapterPath);
    forgetRemoteCache(readerCacheKey(chapterPath));
    notify();
  } catch (error) {
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
      states.delete(chapterPath);
    } else {
      states.set(chapterPath, { status: 'failed', page: 0, total: 0 });
    }

    notify();
  } finally {
    if (controllers.get(chapterPath) === controller) {
      controllers.delete(chapterPath);
    }

    runs.finish(chapterPath, generation);
  }
}
