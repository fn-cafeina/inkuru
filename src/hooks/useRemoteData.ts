import { useCallback, useEffect, useRef, useState } from 'react';

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
  hasError: boolean;
  fetching: boolean;
  refreshing: boolean;
};

// Stale-while-revalidate cache: remounts (stack push, replace, key change)
// show the last result instantly and revalidate in the background. Keys are
// evicted least-recently-written first so a long browsing session cannot grow
// the map without bound.
const CACHE_LIMIT = 50;
const cache = new Map<string, unknown>();

function writeCache(key: string, value: unknown) {
  cache.delete(key);
  cache.set(key, value);

  if (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next().value;

    if (oldest !== undefined) {
      cache.delete(oldest);
    }
  }
}

function initialState<T>(cacheKey?: string): State<T> {
  const cached = cacheKey ? (cache.get(cacheKey) as T | undefined) : undefined;

  return {
    key: cacheKey,
    data: cached ?? null,
    hasError: false,
    fetching: true,
    refreshing: false,
  };
}

export function useRemoteData<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  cacheKey?: string,
): RemoteData<T> {
  const [state, setState] = useState<State<T>>(() => initialState<T>(cacheKey));
  const requestRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);

  // Adjust the state during render (not in an effect) so a key change never
  // yields a frame that still shows the previous key's data.
  if (state.key !== cacheKey) {
    setState(initialState<T>(cacheKey));
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

        if (requestId !== requestRef.current) {
          return;
        }

        if (key !== undefined) {
          writeCache(key, result);
        }

        setState((prev) =>
          prev.key === key ? { ...prev, data: result, hasError: false } : prev,
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
    [cacheKey, fetcher],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the request updates state after fetch resolves
    void run('initial');

    return () => {
      requestRef.current += 1;
      controllerRef.current?.abort();
    };
  }, [run]);

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
