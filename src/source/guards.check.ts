import { isCatalogPage, isMangaDetail, isReaderData } from './guards';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const chapter = { title: 'Capítulo 1', path: '/library/manga/1/cap-1' };

const reader = {
  title: 'Cap. 1',
  mangaTitle: 'Manga',
  pages: ['https://cdn/img-001.webp'],
  chapters: [chapter],
  chapterIndex: 0,
};

assert(isReaderData(reader), 'lector válido debe aceptarse');
assert(
  isReaderData({ ...reader, chapterIndex: -1 }),
  'índice -1 (sin selección) debe aceptarse',
);

assert(
  !isReaderData({ ...reader, pages: [] }),
  'lector sin páginas debe rechazarse',
);
assert(
  !isReaderData({ ...reader, chapterIndex: -2 }),
  'índice negativo fuera de rango debe rechazarse',
);
assert(
  !isReaderData({ ...reader, chapterIndex: 1 }),
  'índice mayor que la lista de capítulos debe rechazarse',
);
assert(
  !isReaderData({ ...reader, chapterIndex: 0.5 }),
  'índice no entero debe rechazarse',
);
assert(
  !isReaderData({ ...reader, pages: [42] }),
  'página no textual debe rechazarse',
);
assert(
  !isReaderData({ ...reader, chapters: [{ title: 1, path: chapter.path }] }),
  'capítulo con título no textual debe rechazarse',
);
assert(
  !isReaderData({ ...reader, title: undefined }),
  'sin título debe rechazarse',
);

assert(
  isMangaDetail({
    title: 'Manga',
    cover: 'https://cdn/cover.jpg',
    synopsis: '...',
    tags: ['Accion'],
    facts: [{ label: 'Autor', value: 'Alguien' }],
    chapters: [chapter],
  }),
  'detalle válido debe aceptarse',
);
assert(
  !isMangaDetail({
    title: 'Manga',
    cover: 'https://cdn/cover.jpg',
    synopsis: '...',
    tags: ['Accion'],
    facts: [{ label: 'Autor' }],
    chapters: [chapter],
  }),
  'dato sin valor debe rechazarse',
);

const item = {
  title: 'Manga',
  cover: 'https://cdn/cover.jpg',
  path: '/library/manga/1/manga',
};

assert(
  isCatalogPage({ items: [item], hasMore: true }),
  'catálogo válido debe aceptarse',
);
assert(
  !isCatalogPage({ items: [{ ...item, cover: 42 }], hasMore: true }),
  'catálogo con portada no textual debe rechazarse',
);
assert(
  !isCatalogPage({ items: [item] }),
  'catálogo sin hasMore debe rechazarse',
);

console.log('cache guards ok');
