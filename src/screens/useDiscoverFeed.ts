import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useReducer,
} from 'react';

import { useRemoteData } from '../hooks/useRemoteData';
import { isCatalogPage } from '../source/guards';
import { fetchCatalog, fetchSearch } from '../source/zonatmo';
import type { CatalogPage } from '../source/zonatmo';
import { CACHE_FRESH_MS } from '../storage/queryCache';
import { forgetRemoteCache } from '../storage/remoteCache';
import { catalogFeedReducer, initialCatalogFeed } from './discoverFeed';

export function useDiscoverFeed(term: string) {
  const [state, dispatch] = useReducer(
    catalogFeedReducer,
    term,
    initialCatalogFeed,
  );
  // A term change must request page 1 even before the reducer reset lands.
  const page = state.term === term ? state.page : 1;
  const fetcher = useCallback(
    async (signal: AbortSignal): Promise<CatalogPage> => {
      if (term) {
        return { items: await fetchSearch(term, signal), hasMore: false };
      }

      return fetchCatalog(page, signal);
    },
    [page, term],
  );
  const {
    data,
    hasError,
    loading,
    fetching,
    refreshing,
    reload,
    refresh,
  } = useRemoteData(fetcher, `discover:${term}:${page}`, {
    freshMs: CACHE_FRESH_MS.catalog,
    persist: true,
    validate: isCatalogPage,
  });

  // Layout effects keep the first painted frame on the new query, and run in
  // order: reset the feed before applying the page that reset requested.
  useLayoutEffect(() => {
    dispatch({ type: 'term', term });
  }, [term]);

  useLayoutEffect(() => {
    if (!data) {
      return;
    }

    dispatch({
      type: 'loaded',
      term,
      page,
      items: data.items,
      hasMore: data.hasMore,
    });
  }, [data, page, term]);

  // A page requested while the previous one was in flight resumes here.
  useEffect(() => {
    if (
      state.term !== term ||
      fetching ||
      hasError ||
      !state.hasMore ||
      state.pendingPage === null ||
      state.pendingPage === state.page
    ) {
      return;
    }

    dispatch({ type: 'advance' });
  }, [
    fetching,
    hasError,
    state.hasMore,
    state.page,
    state.pendingPage,
    state.term,
    term,
  ]);

  const loadMore = useCallback(() => {
    if (
      state.term !== term ||
      hasError ||
      !state.hasMore ||
      state.pendingPage !== null ||
      state.items.length === 0
    ) {
      return;
    }

    dispatch({ type: 'loadMore', page: page + 1 });

    if (!fetching) {
      dispatch({ type: 'advance' });
    }
  }, [
    fetching,
    hasError,
    page,
    state.hasMore,
    state.items.length,
    state.pendingPage,
    state.term,
    term,
  ]);

  const refreshFeed = useCallback(() => {
    const lastPage = Math.max(state.appliedPage, state.page);

    // Refresh rebuilds from page 1, so cached pages after it must go too.
    for (let index = 1; index <= lastPage; index += 1) {
      forgetRemoteCache(`discover:${term}:${index}`);
    }

    dispatch({ type: 'refresh' });

    if (page === 1) {
      refresh();
    }
  }, [page, refresh, state.appliedPage, state.page, term]);

  return {
    items: state.items,
    itemsTerm: state.itemsTerm,
    hasMore: state.hasMore,
    loading,
    fetching,
    hasError,
    refreshing: (state.refreshing && !hasError) || refreshing,
    reload,
    refresh: refreshFeed,
    loadMore,
  };
}
