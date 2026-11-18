import { useCallback } from 'react';

import { useRemoteData } from '../../hooks/useRemoteData';
import { isCatalogPage } from '../../source/guards';
import { fetchCatalog, fetchSearch } from '../../source/zonatmo';
import type { CatalogPage } from '../../source/zonatmo';
import { discoverCacheKey } from '../../storage/cacheKeys';
import { CACHE_FRESH_MS } from '../../storage/queryCache';

/** The feed shows the source's first page of titles and nothing after it. */
const FIRST_PAGE = 1;

export function useDiscoverFeed(term: string) {
  const fetcher = useCallback(
    async (signal: AbortSignal): Promise<CatalogPage> => {
      if (term) {
        return { items: await fetchSearch(term, signal), hasMore: false };
      }

      return fetchCatalog(FIRST_PAGE, signal);
    },
    [term],
  );
  const { data, hasError, loading, fetching, refreshing, reload, refresh } =
    useRemoteData(fetcher, discoverCacheKey(term, FIRST_PAGE), {
      freshMs: CACHE_FRESH_MS.catalog,
      validate: isCatalogPage,
    });

  return {
    items: data?.items ?? [],
    loading,
    fetching,
    hasError,
    refreshing,
    reload,
    refresh,
  };
}
