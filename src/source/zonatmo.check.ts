import { CATALOG_EMPTY_FIXTURE, CATALOG_FIXTURE } from './__fixtures__/catalog';
import { MANGA_FIXTURE } from './__fixtures__/manga';
import { READER_FIXTURE } from './__fixtures__/reader';
import { SEARCH_FIXTURE } from './__fixtures__/search';
import { parseCatalog, parseManga, parseReader, parseSearch } from './zonatmo';

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

function expectThrow(fn: () => void, label: string): void {
  let rejected = false;

  try {
    fn();
  } catch {
    rejected = true;
  }

  assert(rejected, label);
}

const manga = parseManga(MANGA_FIXTURE);

assertEqual(manga.title, 'ONE PUNCH-MAN', 'título del manga');
assertEqual(
  manga.cover,
  'https://zonatmo.org/storage/mangas/covers/4j4OmAAYAfJ64M0om5WhauVH9V3Iv3OLZDaYbl0x.jpg?v=2',
  'portada del manga',
);
assertEqual(manga.tags.join('|'), 'Acción|Aventura', 'tags del manga');
assertEqual(manga.facts.length, 3, 'facts del manga');
assertEqual(
  manga.facts.find((fact) => fact.label === 'Estado')?.value,
  'Ongoing',
  'estado',
);
assertEqual(
  manga.facts.find((fact) => fact.label === 'Tipo')?.value,
  'MANGA',
  'tipo',
);
assertEqual(
  manga.facts.find((fact) => fact.label === 'Demografia')?.value,
  'Seinen',
  'demografía',
);
assert(manga.synopsis.includes('Ciudad-Z'), 'sinopsis decodificada');
assertEqual(manga.chapters.length, 2, 'capítulos del manga');
assertEqual(
  item(manga.chapters, 0).path,
  '/view_uploads/1090001',
  'primer capítulo',
);
assertEqual(item(manga.chapters, 0).title, 'Capítulo 248', 'título del primer capítulo');
assertEqual(item(manga.chapters, 0).date, '2026-10-22', 'fecha del primer capítulo');

const reader = parseReader(READER_FIXTURE);

assertEqual(reader.title, 'Cap. 247 — Actual', 'título del lector');
assertEqual(reader.mangaTitle, 'ONE PUNCH-MAN', 'manga del lector');
assertEqual(reader.chapters.length, 3, 'capítulos del lector');
assertEqual(reader.chapterIndex, 1, 'índice del capítulo actual');
assertEqual(
  item(reader.chapters, reader.chapterIndex).title,
  'Cap. 247 — Actual',
  'capítulo actual del lector',
);
assertEqual(
  item(reader.chapters, 0).path,
  '/view_uploads/1090001',
  'capítulos ordenados del más nuevo al más antiguo',
);
assertEqual(reader.pages.length, 2, 'páginas del lector');
assertEqual(
  item(reader.pages, 0),
  'https://storage2.zonatmo.org/chapters/1090001/1.webp',
  'primera página',
);
assertEqual(
  reader.prev?.path,
  '/view_uploads/1069384',
  'capítulo anterior',
);
assertEqual(reader.prev?.title, 'Cap. 246 — Anterior', 'título anterior');
assertEqual(
  reader.next?.path,
  '/view_uploads/1090001',
  'capítulo siguiente',
);
assertEqual(reader.next?.title, 'Cap. 248 — Siguiente', 'título siguiente');

const search = parseSearch(SEARCH_FIXTURE);

assertEqual(search.length, 1, 'resultados de búsqueda');
assertEqual(item(search, 0).title, 'ONE PUNCH-MAN', 'título de búsqueda');
assertEqual(
  item(search, 0).cover,
  'https://zonatmo.org/storage/mangas/covers/4j4OmAAYAfJ64M0om5WhauVH9V3Iv3OLZDaYbl0x.jpg?v=2',
  'portada de búsqueda',
);
assertEqual(
  item(search, 0).path,
  '/library/manga/8232/one-punch-man',
  'ruta de búsqueda',
);
assertEqual(item(search, 0).lastChapter, undefined, 'búsqueda sin último capítulo');
assertEqual(parseSearch('[]').length, 0, 'búsqueda vacía');
expectThrow(
  () => parseSearch('nope'),
  'JSON inválido de búsqueda debe lanzar error',
);
expectThrow(
  () => parseSearch('{}'),
  'búsqueda sin array debe lanzar error',
);

const catalog = parseCatalog(CATALOG_FIXTURE);

assertEqual(catalog.items.length, 2, 'mangas del catálogo');
assertEqual(item(catalog.items, 0).title, 'ONE PUNCH-MAN', 'título del catálogo');
assertEqual(
  item(catalog.items, 0).cover,
  'https://zonatmo.org/storage/mangas/covers/4j4OmAAYAfJ64M0om5WhauVH9V3Iv3OLZDaYbl0x.jpg?v=2',
  'portada del catálogo',
);
assertEqual(
  item(catalog.items, 0).path,
  '/library/manga/8232/one-punch-man',
  'ruta del catálogo',
);
assertEqual(
  item(catalog.items, 0).lastChapter,
  '279 caps',
  'capítulos del catálogo',
);
assertEqual(
  item(catalog.items, 1).title,
  'Smyrna & Capri',
  'entidades HTML del catálogo',
);
assertEqual(catalog.hasMore, true, 'catálogo con siguiente página');

const emptyCatalog = parseCatalog(CATALOG_EMPTY_FIXTURE);

assertEqual(emptyCatalog.items.length, 0, 'catálogo vacío');
assertEqual(emptyCatalog.hasMore, false, 'catálogo vacío sin siguiente página');
expectThrow(
  () => parseCatalog('<main><p>sin datos</p></main>'),
  'HTML inválido del catálogo debe lanzar error',
);

expectThrow(
  () => parseManga('<main><p>sin datos</p></main>'),
  'HTML inválido del detalle debe lanzar error',
);
expectThrow(
  () => parseReader('<div id="reader-wrap"></div>'),
  'HTML inválido del lector debe lanzar error',
);

console.log('parsers ok');
