import { useCallback, useEffect, useRef, useState } from 'react';

import { readCache, writeCache } from '../storage/queryCache';
import { readRemoteCache, writeRemoteCache } from '../storage/remoteCache';

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

/**
 * Runs a disk read once the JS thread is idle.
 *
 * Opening a screen queues the read behind its push; on a cache with many
 * entries the index rebuild spends ~90ms reading and parsing them, which lands
 * exactly while the user may want to leave again. The memory cache answers
 * instantly, so the disk copy can wait for a frame with nothing else to do.
 */
function onIdle(task: () => void): () => void {
  const handle = requestIdleCallback(task, { timeout: 1000 });

  return () => cancelIdleCallback(handle);
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
          console.warn(`[useRemoteData] ${key ?? 'reader'}:`, error);
        }

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
    [cacheKey, fetcher, validate],
  );

  useEffect(() => {
    let cancelled = false;

    const key = cacheKey;
    const inMemory = readRemoteCache<T>(key);

    if (inMemory && isFresh(inMemory.savedAt, freshMs)) {
      return;
    }

    // Everything left touches disk (the cache index rebuild reads every
    // entry) or the network. Both can wait for an idle frame: the skeleton is
    // already on screen, so nothing visible changes and the back button stays
    // responsive while the user may already want to leave.
    const cancelIdle = onIdle(() => {
      void start();
    });

    return () => {
      cancelled = true;
      cancelIdle();
      requestRef.current += 1;
      controllerRef.current?.abort();
    };

    async function start() {
      if (cancelled) {
        return;
      }

      if (key !== undefined && validate) {
        const stored = await readCache(key, validate);

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
