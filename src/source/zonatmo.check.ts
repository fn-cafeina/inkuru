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

assertEqual(manga.title, 'ONE PUNCH-MAN', 'manga title');
assertEqual(
  manga.cover,
  'https://zonatmo.org/storage/mangas/covers/4j4OmAAYAfJ64M0om5WhauVH9V3Iv3OLZDaYbl0x.jpg?v=2',
  'manga cover',
);
assertEqual(manga.tags.join('|'), 'Acción|Aventura', 'manga tags');
assertEqual(manga.status, 'Ongoing', 'status');
assert(manga.synopsis.includes('Ciudad-Z'), 'synopsis decoded');
assertEqual(manga.chapters.length, 2, 'manga chapters');
assertEqual(
  item(manga.chapters, 0).path,
  '/view_uploads/1090001',
  'first chapter path',
);
assertEqual(item(manga.chapters, 0).title, 'Capítulo 248', 'first chapter title');

const reader = parseReader(READER_FIXTURE);

assertEqual(reader.title, 'Cap. 247 — Actual', 'reader title');
assertEqual(reader.mangaTitle, 'ONE PUNCH-MAN', 'reader manga title');
assertEqual(reader.chapters.length, 3, 'reader chapters');
assertEqual(reader.chapterIndex, 1, 'current chapter index');
assertEqual(
  item(reader.chapters, reader.chapterIndex).title,
  'Cap. 247 — Actual',
  'current reader chapter',
);
assertEqual(
  item(reader.chapters, 0).path,
  '/view_uploads/1090001',
  'chapters ordered newest first',
);
assertEqual(reader.pages.length, 2, 'reader pages');
assertEqual(
  item(reader.pages, 0),
  'https://storage2.zonatmo.org/chapters/1090001/1.webp',
  'first page',
);
assertEqual(
  reader.prev?.path,
  '/view_uploads/1069384',
  'previous chapter path',
);
assertEqual(reader.prev?.title, 'Cap. 246 — Anterior', 'previous chapter title');
assertEqual(
  reader.next?.path,
  '/view_uploads/1090001',
  'next chapter path',
);
assertEqual(reader.next?.title, 'Cap. 248 — Siguiente', 'next chapter title');

const search = parseSearch(SEARCH_FIXTURE);

assertEqual(search.length, 1, 'search results');
assertEqual(item(search, 0).title, 'ONE PUNCH-MAN', 'search title');
assertEqual(
  item(search, 0).cover,
  'https://zonatmo.org/storage/mangas/covers/4j4OmAAYAfJ64M0om5WhauVH9V3Iv3OLZDaYbl0x.jpg?v=2',
  'search cover',
);
assertEqual(
  item(search, 0).path,
  '/library/manga/8232/one-punch-man',
  'search path',
);
assertEqual(item(search, 0).lastChapter, undefined, 'search without last chapter');
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
  'an http cover is served over https',
);

assertEqual(parseSearch('[]').length, 0, 'empty search');
assertEqual(
  parseSearch(
    JSON.stringify([
      { title: 'Sin portada', cover: '', url: 'https://zonatmo.org/library/manga/1/sin-portada' },
    ]),
  ).length,
  0,
  'a result without a cover is discarded',
);
expectThrow(
  () => parseSearch('nope'),
  'invalid search JSON must throw',
);
expectThrow(
  () => parseSearch('{}'),
  'search without an array must throw',
);

const catalog = parseCatalog(CATALOG_FIXTURE);

assertEqual(catalog.items.length, 2, 'catalog mangas');
assertEqual(item(catalog.items, 0).title, 'ONE PUNCH-MAN', 'catalog title');
assertEqual(
  item(catalog.items, 0).cover,
  'https://zonatmo.org/storage/mangas/covers/4j4OmAAYAfJ64M0om5WhauVH9V3Iv3OLZDaYbl0x.jpg?v=2',
  'catalog cover',
);
assertEqual(
  item(catalog.items, 0).path,
  '/library/manga/8232/one-punch-man',
  'catalog path',
);
assertEqual(
  item(catalog.items, 0).lastChapter,
  '279 caps',
  'catalog last chapter',
);
assertEqual(
  item(catalog.items, 1).title,
  'Smyrna & Capri',
  'catalog html entities',
);
assertEqual(catalog.hasMore, true, 'catalog with a next page');

// The parser must accept single-quoted attributes, which are valid HTML.
const singleQuoted = parseCatalog(
  CATALOG_FIXTURE.replace(/src="([^"]*covers[^"]*)"/g, "src='$1'"),
);

assertEqual(singleQuoted.items.length, 2, 'catalog with single quotes');
assertEqual(
  item(singleQuoted.items, 0).cover,
  'https://zonatmo.org/storage/mangas/covers/4j4OmAAYAfJ64M0om5WhauVH9V3Iv3OLZDaYbl0x.jpg?v=2',
  'cover with single quotes',
);

// A card whose class attribute uses single quotes must still be found.
const singleQuotedClass = parseCatalog(
  CATALOG_FIXTURE.replace(/class="element /g, "class='element "),
);

assertEqual(singleQuotedClass.items.length, 2, 'card class with single quotes');

// Text helpers read class attributes too, so the same card must keep its title.
const singleQuotedTitle = parseCatalog(
  CATALOG_FIXTURE.replace(/class="text-truncate"/g, "class='text-truncate'"),
);

assertEqual(singleQuotedTitle.items.length, 2, 'title with single quotes');
assertEqual(
  item(singleQuotedTitle.items, 0).title,
  'ONE PUNCH-MAN',
  'text with single quotes',
);

const singleQuotedDetail = parseManga(
  MANGA_FIXTURE.replace(
    'class="element-title my-2"',
    "class='element-title my-2'",
  ),
);

assertEqual(singleQuotedDetail.title, 'ONE PUNCH-MAN', 'detail with single quotes');

// Attribute order inside the paginator must not decide hasMore.
const reorderedPaginator = parseCatalog(
  CATALOG_FIXTURE.replace(
    'class="page-link" href="https://zonatmo.org/biblioteca?page=2" rel="next"',
    'rel="next" class="page-link" href="https://zonatmo.org/biblioteca?page=2"',
  ),
);

assertEqual(reorderedPaginator.hasMore, true, 'paginator with rel first');

const lastCatalog = parseCatalog(CATALOG_FIXTURE.replace(' rel="next"', ''));

assertEqual(lastCatalog.items.length, 2, 'last page with mangas');
assertEqual(lastCatalog.hasMore, false, 'last page without a next');

// A rel="next" that is not a paginator link must not count as more pages.
const headRelNext = parseCatalog(
  CATALOG_FIXTURE.replace(' rel="next"', '') +
    '<head><link rel="next" href="/biblioteca?page=3"></head>',
);

assertEqual(headRelNext.hasMore, false, 'rel="next" outside the paginator');

const emptyCatalog = parseCatalog(CATALOG_EMPTY_FIXTURE);

assertEqual(emptyCatalog.items.length, 0, 'empty catalog');
assertEqual(emptyCatalog.hasMore, false, 'empty catalog without a next page');
expectThrow(
  () => parseCatalog('<main><p>sin datos</p></main>'),
  'invalid catalog HTML must throw',
);

expectThrow(
  () => parseManga('<main><p>sin datos</p></main>'),
  'invalid detail HTML must throw',
);
expectThrow(
  () => parseReader('<div id="reader-wrap"></div>'),
  'invalid reader HTML must throw',
);

console.log('parsers ok');
