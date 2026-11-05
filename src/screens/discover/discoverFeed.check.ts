import type { MangaListItem } from '../../source/zonatmo';
import {
  catalogFeedReducer,
  initialCatalogFeed,
  mergeCatalogItems,
} from './discoverFeed';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual<T>(actual: T, expected: T, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

function item<T>(values: readonly T[], index: number): T {
  const value = values[index];

  if (value === undefined) {
    throw new Error(`index ${index} out of range`);
  }

  return value;
}

function manga(path: string): MangaListItem {
  return { title: path, cover: `${path}.jpg`, path };
}

const first = manga('/library/manga/1');
const second = manga('/library/manga/2');
const third = manga('/library/manga/3');

let state = initialCatalogFeed('');

assertEqual(state.page, 1, 'the initial page');
assertEqual(state.appliedPage, 0, 'the initial applied page');
assertEqual(state.refreshing, false, 'no initial refresh');

state = catalogFeedReducer(state, {
  type: 'loaded',
  term: '',
  page: 1,
  items: [first, second],
  hasMore: true,
});

assertEqual(state.items.length, 2, 'the first page');
assertEqual(state.appliedPage, 1, 'the first applied page');

state = catalogFeedReducer(state, { type: 'loadMore', page: 2 });

assertEqual(state.pendingPage, 2, 'the pending page');
assertEqual(state.page, 1, 'it does not advance while loading');

state = catalogFeedReducer(state, { type: 'advance' });

assertEqual(state.page, 2, 'it advances to the pending page');
assertEqual(state.pendingPage, 2, 'the pending page is kept until applied');

state = catalogFeedReducer(state, {
  type: 'loaded',
  term: '',
  page: 2,
  items: [second, third],
  hasMore: true,
});

assertEqual(state.items.length, 3, 'pages merge without duplicates');
assertEqual(item(state.items, 2).path, third.path, 'the third manga');
assertEqual(state.pendingPage, null, 'the pending page clears on apply');
assertEqual(state.appliedPage, 2, 'the second applied page');

const duplicate = catalogFeedReducer(state, {
  type: 'loaded',
  term: '',
  page: 2,
  items: [third],
  hasMore: false,
});

assert(duplicate === state, 'an already applied page is ignored');

const stale = catalogFeedReducer(state, {
  type: 'loaded',
  term: 'naruto',
  page: 1,
  items: [third],
  hasMore: false,
});

assert(stale === state, 'data for another term is ignored');

state = catalogFeedReducer(state, { type: 'term', term: 'naruto' });

assertEqual(state.page, 1, 'a new term returns to page 1');
assertEqual(state.appliedPage, 0, 'a new term resets the applied page');
assertEqual(state.pendingPage, null, 'a new term clears the pending page');
assertEqual(state.items.length, 3, 'previous results are kept');
assertEqual(state.itemsTerm, '', 'previous results are marked');

state = catalogFeedReducer(state, {
  type: 'loaded',
  term: 'naruto',
  page: 1,
  items: [third],
  hasMore: false,
});

assertEqual(state.items.length, 1, 'the new term replaces the list');
assertEqual(state.itemsTerm, 'naruto', 'the new term is marked');

state = catalogFeedReducer(state, { type: 'refresh' });

assertEqual(state.page, 1, 'refresh returns to page 1');
assertEqual(state.appliedPage, 0, 'refresh allows page 1 to reapply');
assertEqual(state.refreshing, true, 'refresh shows the spinner');

state = catalogFeedReducer(state, {
  type: 'loaded',
  term: 'naruto',
  page: 1,
  items: [first],
  hasMore: false,
});

assertEqual(state.items.length, 1, 'refresh replaces the list');
assertEqual(item(state.items, 0).path, first.path, 'refresh applies the new data');
assertEqual(state.refreshing, false, 'refresh ends when page 1 applies');

const merged = mergeCatalogItems([first, second], [second, third]);

assertEqual(merged.length, 3, 'merge dedupes by path');
assertEqual(item(merged, 2).path, third.path, 'merge keeps the order');

console.log('discover feed ok');
