import { useCallback, useEffect, useRef, useState } from 'react';

type RemoteData<T> = {
  data: T | null;
  hasError: boolean;
  loading: boolean;
  refreshing: boolean;
  reload: () => void;
  refresh: () => void;
};

export function useRemoteData<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
): RemoteData<T> {
  const [data, setData] = useState<T | null>(null);
  const [hasError, setHasError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const requestRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);

  const run = useCallback(async () => {
    controllerRef.current?.abort();

    const controller = new AbortController();
    controllerRef.current = controller;
    const requestId = ++requestRef.current;
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const result = await fetcher(controller.signal);

      if (requestId === requestRef.current) {
        setData(result);
        setHasError(false);
      }
    } catch {
      if (requestId === requestRef.current) {
        setHasError(true);
      }
    } finally {
      clearTimeout(timeout);

      if (requestId === requestRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [fetcher]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the request updates state after fetch resolves
    void run();

    return () => {
      requestRef.current += 1;
      controllerRef.current?.abort();
    };
  }, [run]);

  const reload = useCallback(() => {
    setLoading(true);
    setHasError(false);
    void run();
  }, [run]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    setHasError(false);
    void run();
  }, [run]);

  return { data, hasError, loading, refreshing, reload, refresh };
}
