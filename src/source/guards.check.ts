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

assert(isReaderData(reader), 'a valid reader is accepted');
assert(
  isReaderData({ ...reader, chapterIndex: -1 }),
  'index -1 (no selection) is accepted',
);

assert(
  !isReaderData({ ...reader, pages: [] }),
  'a reader without pages is rejected',
);
assert(
  !isReaderData({ ...reader, chapterIndex: -2 }),
  'a negative out-of-range index is rejected',
);
assert(
  !isReaderData({ ...reader, chapterIndex: 1 }),
  'an index past the chapter list is rejected',
);
assert(
  !isReaderData({ ...reader, chapterIndex: 0.5 }),
  'a non-integer index is rejected',
);
assert(
  !isReaderData({ ...reader, pages: [42] }),
  'a non-text page is rejected',
);
assert(
  !isReaderData({ ...reader, chapters: [{ title: 1, path: chapter.path }] }),
  'a chapter with a non-text title is rejected',
);
assert(
  !isReaderData({ ...reader, title: undefined }),
  'a missing title is rejected',
);

assert(
  isMangaDetail({
    title: 'Manga',
    cover: 'https://cdn/cover.jpg',
    synopsis: '...',
    tags: ['Accion'],
    status: 'Ongoing',
    chapters: [chapter],
  }),
  'a valid detail is accepted',
);
assert(
  !isMangaDetail({
    title: 'Manga',
    cover: 'https://cdn/cover.jpg',
    synopsis: '...',
    tags: ['Accion'],
    status: 7,
    chapters: [chapter],
  }),
  'a non-text status is rejected',
);

const item = {
  title: 'Manga',
  cover: 'https://cdn/cover.jpg',
  path: '/library/manga/1/manga',
};

assert(
  isCatalogPage({ items: [item], hasMore: true }),
  'a valid catalog is accepted',
);
assert(
  !isCatalogPage({ items: [{ ...item, cover: 42 }], hasMore: true }),
  'a catalog with a non-text cover is rejected',
);
assert(
  !isCatalogPage({ items: [item] }),
  'a catalog without hasMore is rejected',
);

console.log('cache guards ok');
