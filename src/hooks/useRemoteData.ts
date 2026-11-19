import { useCallback, useEffect, useRef, useState } from 'react';

import { readCache, writeCache } from '@/storage/queryCache';
import { readRemoteCache, writeRemoteCache } from '@/storage/remoteCache';
import { withTimeout } from '@/downloads/timeout';
import { REQUEST_TIMEOUT_MS } from '@/source/http';
import { log, ms, reason, seconds } from '@/dev/log';

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
  /** Runtime guard for values read back from storage; enables persistence. */
  validate?: (value: unknown) => value is T;
};

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
  const cached = readRemoteCache<T>(cacheKey);

  return {
    key: cacheKey,
    data: cached?.value ?? null,
    savedAt: cached?.savedAt ?? null,
    hasError: false,
    fetching: !isFresh(cached?.savedAt, freshMs),
    refreshing: false,
  };
}

export function useRemoteData<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  cacheKey?: string,
  options: Options<T> = {},
): RemoteData<T> {
  const { freshMs, validate } = options;
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

      const startedAt = performance.now();

      try {
        // A request hanging past the budget is aborted and read as an error.
        const result = await withTimeout(controller, REQUEST_TIMEOUT_MS, () =>
          fetcher(controller.signal),
        );
        const savedAt = Date.now();

        log.debug('fetch', key ?? 'reader', { ms: ms(startedAt) });

        // Cache valid results even if the consumer unmounted while the
        // request was in flight; the next mount should not pay for it again.
        if (key !== undefined) {
          writeRemoteCache(key, result, savedAt);

          if (validate) {
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
      } catch (error) {
        // Expected when superseded or timed out; real failures (network,
        // markup changes) are logged so they are not invisible.
        if (!controller.signal.aborted) {
          log.warn('fetch', key ?? 'reader', {
            ms: ms(startedAt),
            reason: reason(error),
          });
        }

        if (requestId === requestRef.current) {
          setState((prev) =>
            prev.key === key ? { ...prev, hasError: true } : prev,
          );
        }
      } finally {
        if (requestId === requestRef.current) {
          setState((prev) =>
            prev.key === key
              ? { ...prev, fetching: false, refreshing: false }
              : prev,
          );
        }
      }
    },
    [cacheKey, fetcher, validate],
  );

  useEffect(() => {
    let cancelled = false;

    const key = cacheKey;
    const inMemory = readRemoteCache<T>(key);

    if (inMemory && isFresh(inMemory.savedAt, freshMs)) {
      log.debug('cache', key ?? 'reader', {
        source: 'memory',
        age: seconds(Date.now() - inMemory.savedAt),
      });
      return;
    }

    // The disk read starts now, not on an idle frame. The skeleton pulse keeps
    // the native side busy, so the idle callback was starved and every cold
    // open paid the full 1s timeout before showing a cached manga. A cache hit
    // is one getItem; only the rare stale or missing entry rebuilds the index.
    void start();

    return () => {
      cancelled = true;
      requestRef.current += 1;
      controllerRef.current?.abort();
    };

    async function start() {
      if (cancelled) {
        return;
      }

      if (key !== undefined && validate) {
        const startedAt = performance.now();
        const stored = await readCache(key, validate);

        log.debug('cache', key, {
          source: 'disk',
          hit: stored !== null,
          ms: ms(startedAt),
          age: stored ? seconds(Date.now() - stored.savedAt) : undefined,
        });

        if (cancelled) {
          return;
        }

        if (stored) {
          writeRemoteCache(key, stored.value, stored.savedAt);
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
      }

      if (!cancelled) {
        void run('initial');
      }
    }
  }, [run, cacheKey, freshMs, validate]);

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
