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
assertEqual(manga.status, 'Ongoing', 'estado');
assert(manga.synopsis.includes('Ciudad-Z'), 'sinopsis decodificada');
assertEqual(manga.chapters.length, 2, 'capítulos del manga');
assertEqual(
  item(manga.chapters, 0).path,
  '/view_uploads/1090001',
  'primer capítulo',
);
assertEqual(item(manga.chapters, 0).title, 'Capítulo 248', 'título del primer capítulo');

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
const upgraded = parseSearch(
  JSON.stringify([
    {
      title: 'Http',
      cover: 'http://cdn.example/x.jpg',
      url: 'https://zonatmo.org/library/manga/2/http',
    },
  ]),
);

assertEqual(
  item(upgraded, 0).cover,
  'https://cdn.example/x.jpg',
  'una portada http se sirve por https',
);

assertEqual(parseSearch('[]').length, 0, 'búsqueda vacía');
assertEqual(
  parseSearch(
    JSON.stringify([
      { title: 'Sin portada', cover: '', url: 'https://zonatmo.org/library/manga/1/sin-portada' },
    ]),
  ).length,
  0,
  'resultado sin portada se descarta',
);
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

// The parser must accept single-quoted attributes, which are valid HTML.
const singleQuoted = parseCatalog(
  CATALOG_FIXTURE.replace(/src="([^"]*covers[^"]*)"/g, "src='$1'"),
);

assertEqual(singleQuoted.items.length, 2, 'catálogo con comillas simples');
assertEqual(
  item(singleQuoted.items, 0).cover,
  'https://zonatmo.org/storage/mangas/covers/4j4OmAAYAfJ64M0om5WhauVH9V3Iv3OLZDaYbl0x.jpg?v=2',
  'portada del catálogo con comillas simples',
);

// A card whose class attribute uses single quotes must still be found.
const singleQuotedClass = parseCatalog(
  CATALOG_FIXTURE.replace(/class="element /g, "class='element "),
);

assertEqual(singleQuotedClass.items.length, 2, 'clase de tarjeta con comillas simples');

// Text helpers read class attributes too, so the same card must keep its title.
const singleQuotedTitle = parseCatalog(
  CATALOG_FIXTURE.replace(/class="text-truncate"/g, "class='text-truncate'"),
);

assertEqual(singleQuotedTitle.items.length, 2, 'título con comillas simples');
assertEqual(
  item(singleQuotedTitle.items, 0).title,
  'ONE PUNCH-MAN',
  'texto con comillas simples',
);

const singleQuotedDetail = parseManga(
  MANGA_FIXTURE.replace(
    'class="element-title my-2"',
    "class='element-title my-2'",
  ),
);

assertEqual(singleQuotedDetail.title, 'ONE PUNCH-MAN', 'detalle con comillas simples');

// Attribute order inside the paginator must not decide hasMore.
const reorderedPaginator = parseCatalog(
  CATALOG_FIXTURE.replace(
    'class="page-link" href="https://zonatmo.org/biblioteca?page=2" rel="next"',
    'rel="next" class="page-link" href="https://zonatmo.org/biblioteca?page=2"',
  ),
);

assertEqual(reorderedPaginator.hasMore, true, 'paginador con rel primero');

const lastCatalog = parseCatalog(CATALOG_FIXTURE.replace(' rel="next"', ''));

assertEqual(lastCatalog.items.length, 2, 'última página con mangas');
assertEqual(lastCatalog.hasMore, false, 'última página sin siguiente');

// A rel="next" that is not a paginator link must not count as more pages.
const headRelNext = parseCatalog(
  CATALOG_FIXTURE.replace(' rel="next"', '') +
    '<head><link rel="next" href="/biblioteca?page=3"></head>',
);

assertEqual(headRelNext.hasMore, false, 'rel="next" fuera del paginador');

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
