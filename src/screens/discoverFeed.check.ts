import type { MangaListItem } from '../source/zonatmo';
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
    throw new Error(`${label}: esperado ${String(expected)}, recibido ${String(actual)}`);
  }
}

function item<T>(values: readonly T[], index: number): T {
  const value = values[index];

  if (value === undefined) {
    throw new Error(`Índice ${index} fuera de rango`);
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

assertEqual(state.page, 1, 'página inicial');
assertEqual(state.appliedPage, 0, 'página aplicada inicial');
assertEqual(state.refreshing, false, 'sin refresh inicial');

state = catalogFeedReducer(state, {
  type: 'loaded',
  term: '',
  page: 1,
  items: [first, second],
  hasMore: true,
});

assertEqual(state.items.length, 2, 'primera página');
assertEqual(state.appliedPage, 1, 'primera página aplicada');

state = catalogFeedReducer(state, { type: 'loadMore', page: 2 });

assertEqual(state.pendingPage, 2, 'página pendiente');
assertEqual(state.page, 1, 'no avanza mientras carga');

state = catalogFeedReducer(state, { type: 'advance' });

assertEqual(state.page, 2, 'avanza a la página pendiente');
assertEqual(state.pendingPage, 2, 'mantiene pendiente hasta aplicar');

state = catalogFeedReducer(state, {
  type: 'loaded',
  term: '',
  page: 2,
  items: [second, third],
  hasMore: true,
});

assertEqual(state.items.length, 3, 'une páginas sin duplicados');
assertEqual(item(state.items, 2).path, third.path, 'tercer manga');
assertEqual(state.pendingPage, null, 'limpia pendiente al aplicar');
assertEqual(state.appliedPage, 2, 'segunda página aplicada');

const duplicate = catalogFeedReducer(state, {
  type: 'loaded',
  term: '',
  page: 2,
  items: [third],
  hasMore: false,
});

assert(duplicate === state, 'ignora una página ya aplicada');

const stale = catalogFeedReducer(state, {
  type: 'loaded',
  term: 'naruto',
  page: 1,
  items: [third],
  hasMore: false,
});

assert(stale === state, 'ignora datos de otro término');

state = catalogFeedReducer(state, { type: 'term', term: 'naruto' });

assertEqual(state.page, 1, 'término nuevo vuelve a página 1');
assertEqual(state.appliedPage, 0, 'término nuevo reinicia página aplicada');
assertEqual(state.pendingPage, null, 'término nuevo limpia pendiente');
assertEqual(state.items.length, 3, 'conserva resultados anteriores');
assertEqual(state.itemsTerm, '', 'marca los resultados anteriores');

state = catalogFeedReducer(state, {
  type: 'loaded',
  term: 'naruto',
  page: 1,
  items: [third],
  hasMore: false,
});

assertEqual(state.items.length, 1, 'reemplaza con el término nuevo');
assertEqual(state.itemsTerm, 'naruto', 'marca el término nuevo');

state = catalogFeedReducer(state, { type: 'refresh' });

assertEqual(state.page, 1, 'refresh vuelve a página 1');
assertEqual(state.appliedPage, 0, 'refresh permite reaplicar página 1');
assertEqual(state.refreshing, true, 'refresh muestra spinner');

state = catalogFeedReducer(state, {
  type: 'loaded',
  term: 'naruto',
  page: 1,
  items: [first],
  hasMore: false,
});

assertEqual(state.items.length, 1, 'refresh reemplaza la lista');
assertEqual(item(state.items, 0).path, first.path, 'refresh aplica datos nuevos');
assertEqual(state.refreshing, false, 'refresh termina al aplicar página 1');

const merged = mergeCatalogItems([first, second], [second, third]);

assertEqual(merged.length, 3, 'merge deduplica por ruta');
assertEqual(item(merged, 2).path, third.path, 'merge conserva el orden');

console.log('discover feed ok');
