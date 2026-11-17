import type {
  DownloadInput,
  DownloadRecord,
  DownloadState,
} from './types';

/**
 * In-memory state shared by the download lifecycle and its readers. It lives in
 * its own module so the manager stays about scheduling, and so `subscribe`
 * callers import a store that does not drag the runner in.
 */
export const store = {
  states: new Map<string, DownloadState>(),
  records: new Map<string, DownloadRecord>(),
  /**
   * Memoized 'done' states. getDownloadState feeds useSyncExternalStore, so
   * the snapshot must keep its identity between notifications.
   */
  doneStates: new Map<string, DownloadState>(),
  controllers: new Map<string, AbortController>(),
  queue: [] as DownloadInput[],
  listeners: new Set<() => void>(),
  version: 0,
  concurrency: 1,
  initialized: false,
  initializing: null as Promise<void> | null,
};

export function notify(): void {
  store.version += 1;

  for (const listener of store.listeners) {
    listener();
  }
}

export function subscribe(listener: () => void): () => void {
  store.listeners.add(listener);

  return () => {
    store.listeners.delete(listener);
  };
}

export function getVersion(): number {
  return store.version;
}

export function getDownloadState(
  chapterPath: string,
): DownloadState | undefined {
  const state = store.states.get(chapterPath);

  if (state) {
    return state;
  }

  const record = store.records.get(chapterPath);

  if (record === undefined) {
    return undefined;
  }

  let done = store.doneStates.get(chapterPath);

  if (done === undefined) {
    done = { status: 'done', page: record.pageCount, total: record.pageCount };
    store.doneStates.set(chapterPath, done);
  }

  return done;
}
