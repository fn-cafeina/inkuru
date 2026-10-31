import { fetchReader } from '../source/zonatmo';
import { forgetRemoteCache } from '../storage/remoteCache';
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
import { hashKey } from './paths';
import type {
  DownloadInput,
  DownloadRecord,
  DownloadState,
} from './types';

const MAX_PARALLEL_PAGES = 3;

const states = new Map<string, DownloadState>();
const records = new Map<string, DownloadRecord>();
const controllers = new Map<string, AbortController>();
const cancelled = new Set<string>();
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

export function enqueueDownload(input: DownloadInput) {
  const current = states.get(input.chapterPath);

  if (records.has(input.chapterPath)) {
    return;
  }

  if (current && current.status !== 'failed') {
    return;
  }

  states.set(input.chapterPath, { status: 'queued', page: 0, total: 0 });
  queue.push(input);
  notify();
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
    cancelled.add(chapterPath);
    controllers.get(chapterPath)?.abort();
  }
}

export async function deleteDownload(chapterPath: string) {
  const controller = controllers.get(chapterPath);

  if (controller) {
    cancelled.add(chapterPath);
    controller.abort();
  }

  const index = queue.findIndex((item) => item.chapterPath === chapterPath);

  if (index >= 0) {
    queue.splice(index, 1);
  }

  states.delete(chapterPath);
  records.delete(chapterPath);
  deleteChapterFiles(chapterPath);
  forgetRemoteCache(`reader:${chapterPath}`);
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
        valid.map((record) => hashKey(record.chapterPath)),
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
  const controller = new AbortController();
  controllers.set(chapterPath, controller);
  states.set(chapterPath, { status: 'downloading', page: 0, total: 0 });
  notify();

  try {
    const data = await fetchReader(chapterPath, controller.signal);
    const total = data.pages.length;
    const directory = prepareChapterDirectory(chapterPath);
    const localPages: string[] = [];
    let completed = 0;
    let cursor = 0;

    states.set(chapterPath, { status: 'downloading', page: 0, total });
    notify();

    const worker = async () => {
      while (cursor < total) {
        if (controller.signal.aborted) {
          throw new Error('aborted');
        }

        const index = cursor;
        cursor += 1;
        const url = data.pages[index];

        if (!url) {
          continue;
        }

        const file = pageFile(directory, index, url);
        await downloadPage(url, file, controller.signal);
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

    await Promise.all(
      Array.from({ length: Math.min(MAX_PARALLEL_PAGES, total) }, () =>
        worker(),
      ),
    );

    if (controller.signal.aborted) {
      throw new Error('aborted');
    }

    if (completed !== total || localPages.length !== total) {
      throw new Error('incomplete');
    }

    const record: DownloadRecord = {
      ...input,
      pageCount: total,
      completedAt: Date.now(),
    };

    await writeDownloadFile(directory, {
      version: 1,
      record,
      data: { ...data, pages: localPages },
    });
    records.set(chapterPath, record);
    await upsertRecord(record);
    states.delete(chapterPath);
    forgetRemoteCache(`reader:${chapterPath}`);
    notify();
  } catch {
    const wasCancelled =
      cancelled.delete(chapterPath) || controller.signal.aborted;

    deleteChapterFiles(chapterPath);

    if (wasCancelled) {
      states.delete(chapterPath);
    } else {
      states.set(chapterPath, { status: 'failed', page: 0, total: 0 });
    }

    notify();
  } finally {
    controllers.delete(chapterPath);
  }
}
