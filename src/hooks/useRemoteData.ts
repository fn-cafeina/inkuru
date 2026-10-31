import { useCallback, useEffect, useRef, useState } from 'react';

import {
  readCache,
  removeCache,
  writeCache,
} from '../storage/queryCache';

type RemoteData<T> = {
  data: T | null;
  hasError: boolean;
  /** No data yet and a request is in flight. */
  loading: boolean;
  /** Any request in flight, including a background revalidation. */
  fetching: boolean;
  refreshing: boolean;
  reload: () => void;
  refresh: () => void;
};

type Mode = 'initial' | 'reload' | 'refresh';

type State<T> = {
  key: string | undefined;
  data: T | null;
  savedAt: number | null;
  hasError: boolean;
  fetching: boolean;
  refreshing: boolean;
};

type Options<T> = {
  /** Skip revalidation while the cached value is younger than this. */
  freshMs?: number;
  /** Persist successful results across app restarts. */
  persist?: boolean;
  /** Runtime guard for values read back from storage. */
  validate?: (value: unknown) => value is T;
};

type CacheEntry = { value: unknown; savedAt: number };

// Stale-while-revalidate cache: remounts (stack push, replace, key change)
// show the last result instantly and revalidate in the background. Keys are
// evicted least-recently-written first so a long browsing session cannot grow
// the map without bound.
const CACHE_LIMIT = 50;
const cache = new Map<string, CacheEntry>();

function readMemory<T>(
  key: string | undefined,
): { value: T; savedAt: number } | undefined {
  if (key === undefined) {
    return undefined;
  }

  const entry = cache.get(key);

  if (!entry) {
    return undefined;
  }

  // Touch on read so hot keys survive eviction.
  cache.delete(key);
  cache.set(key, entry);

  return { value: entry.value as T, savedAt: entry.savedAt };
}

function writeMemory(key: string, value: unknown, savedAt: number) {
  cache.delete(key);
  cache.set(key, { value, savedAt });

  if (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next().value;

    if (oldest !== undefined) {
      cache.delete(oldest);
    }
  }
}

function isFresh(savedAt: number | null | undefined, freshMs?: number) {
  return (
    savedAt !== null &&
    savedAt !== undefined &&
    freshMs !== undefined &&
    Date.now() - savedAt < freshMs
  );
}

function initialState<T>(
  cacheKey: string | undefined,
  freshMs?: number,
): State<T> {
  const cached = readMemory<T>(cacheKey);

  return {
    key: cacheKey,
    data: cached?.value ?? null,
    savedAt: cached?.savedAt ?? null,
    hasError: false,
    fetching: !isFresh(cached?.savedAt, freshMs),
    refreshing: false,
  };
}

/** Drop a cached result, both in memory and on disk. */
export function forgetRemoteData(key: string) {
  cache.delete(key);
  void removeCache(key);
}

export function useRemoteData<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  cacheKey?: string,
  options: Options<T> = {},
): RemoteData<T> {
  const { freshMs, persist = false, validate } = options;
  const [state, setState] = useState<State<T>>(() =>
    initialState<T>(cacheKey, freshMs),
  );
  const requestRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);

  // Adjust the state during render (not in an effect) so a key change never
  // yields a frame that still shows the previous key's data.
  if (state.key !== cacheKey) {
    setState(initialState<T>(cacheKey, freshMs));
  }

  const run = useCallback(
    async (mode: Mode) => {
      controllerRef.current?.abort();

      const controller = new AbortController();
      controllerRef.current = controller;
      const requestId = ++requestRef.current;
      const key = cacheKey;
      const timeout = setTimeout(() => controller.abort(), 15000);

      setState((prev) =>
        prev.key === key
          ? {
              ...prev,
              fetching: true,
              refreshing: mode === 'refresh',
              hasError: mode === 'initial' ? prev.hasError : false,
            }
          : prev,
      );

      try {
        const result = await fetcher(controller.signal);
        const savedAt = Date.now();

        // Cache valid results even if the consumer unmounted while the
        // request was in flight; the next mount should not pay for it again.
        if (key !== undefined) {
          writeMemory(key, result, savedAt);

          if (persist) {
            writeCache(key, result);
          }
        }

        if (requestId !== requestRef.current) {
          return;
        }

        setState((prev) =>
          prev.key === key
            ? { ...prev, data: result, savedAt, hasError: false }
            : prev,
        );
      } catch {
        if (requestId === requestRef.current) {
          setState((prev) =>
            prev.key === key ? { ...prev, hasError: true } : prev,
          );
        }
      } finally {
        clearTimeout(timeout);

        if (requestId === requestRef.current) {
          setState((prev) =>
            prev.key === key
              ? { ...prev, fetching: false, refreshing: false }
              : prev,
          );
        }
      }
    },
    [cacheKey, fetcher, persist],
  );

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      const key = cacheKey;
      const inMemory = readMemory<T>(key);

      if (key !== undefined && persist && validate && !inMemory) {
        const stored = await readCache(key, validate);

        if (cancelled) {
          return;
        }

        if (stored) {
          writeMemory(key, stored.value, stored.savedAt);
          setState((prev) =>
            prev.key === key
              ? {
                  ...prev,
                  data: stored.value,
                  savedAt: stored.savedAt,
                  fetching: false,
                }
              : prev,
          );

          if (isFresh(stored.savedAt, freshMs)) {
            return;
          }
        }
      } else if (inMemory && isFresh(inMemory.savedAt, freshMs)) {
        return;
      }

      if (!cancelled) {
        void run('initial');
      }
    };

    void start();

    return () => {
      cancelled = true;
      requestRef.current += 1;
      controllerRef.current?.abort();
    };
  }, [run, cacheKey, freshMs, persist, validate]);

  const reload = useCallback(() => {
    void run('reload');
  }, [run]);

  const refresh = useCallback(() => {
    void run('refresh');
  }, [run]);

  return {
    data: state.data,
    hasError: state.hasError,
    loading: state.data === null && state.fetching,
    fetching: state.fetching,
    refreshing: state.refreshing,
    reload,
    refresh,
  };
}
