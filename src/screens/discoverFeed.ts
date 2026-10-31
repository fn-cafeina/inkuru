import type { MangaListItem } from '../source/zonatmo';

export type CatalogFeedState = {
  term: string;
  itemsTerm: string;
  page: number;
  items: MangaListItem[];
  hasMore: boolean;
  appliedPage: number;
  pendingPage: number | null;
  refreshing: boolean;
};

export type CatalogFeedAction =
  | { type: 'term'; term: string }
  | {
      type: 'loaded';
      term: string;
      page: number;
      items: MangaListItem[];
      hasMore: boolean;
    }
  | { type: 'loadMore'; page: number }
  | { type: 'advance' }
  | { type: 'refresh' };

export function initialCatalogFeed(term: string): CatalogFeedState {
  return {
    term,
    itemsTerm: term,
    page: 1,
    items: [],
    hasMore: false,
    appliedPage: 0,
    pendingPage: null,
    refreshing: false,
  };
}

export function catalogFeedReducer(
  state: CatalogFeedState,
  action: CatalogFeedAction,
): CatalogFeedState {
  switch (action.type) {
    case 'term':
      return applyTerm(state, action.term);

    case 'loaded':
      return applyLoaded(state, action);

    case 'loadMore':
      return applyLoadMore(state, action.page);

    case 'advance':
      return applyAdvance(state);

    case 'refresh':
      return {
        ...state,
        page: 1,
        appliedPage: 0,
        pendingPage: null,
        refreshing: true,
      };
  }
}

function applyTerm(state: CatalogFeedState, term: string): CatalogFeedState {
  if (state.term === term) {
    return state;
  }

  return {
    ...state,
    term,
    page: 1,
    hasMore: false,
    appliedPage: 0,
    pendingPage: null,
    refreshing: false,
  };
}

function applyLoaded(
  state: CatalogFeedState,
  action: Extract<CatalogFeedAction, { type: 'loaded' }>,
): CatalogFeedState {
  if (action.term !== state.term) {
    return state;
  }

  if (action.page === 1) {
    return {
      ...state,
      items: action.items,
      itemsTerm: action.term,
      hasMore: action.hasMore,
      appliedPage: 1,
      pendingPage: action.hasMore ? state.pendingPage : null,
      refreshing: false,
    };
  }

  if (action.page <= state.appliedPage) {
    return state;
  }

  return {
    ...state,
    items: mergeCatalogItems(state.items, action.items),
    itemsTerm: action.term,
    hasMore: action.hasMore,
    appliedPage: action.page,
    pendingPage:
      action.page === state.pendingPage || !action.hasMore
        ? null
        : state.pendingPage,
  };
}

function applyLoadMore(
  state: CatalogFeedState,
  page: number,
): CatalogFeedState {
  if (!state.hasMore || state.pendingPage !== null) {
    return state;
  }

  return { ...state, pendingPage: page };
}

function applyAdvance(state: CatalogFeedState): CatalogFeedState {
  if (state.pendingPage === null || state.pendingPage === state.page) {
    return state;
  }

  return { ...state, page: state.pendingPage };
}

export function mergeCatalogItems(
  current: MangaListItem[],
  next: MangaListItem[],
): MangaListItem[] {
  const merged = [...current];
  const seen = new Set(current.map((item) => item.path));

  for (const item of next) {
    if (!seen.has(item.path)) {
      seen.add(item.path);
      merged.push(item);
    }
  }

  return merged;
}
