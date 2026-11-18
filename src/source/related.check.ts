import { MANGA_RELATED_FIXTURE } from './__fixtures__/manga';
import { parseMangaRelated } from './related';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function item<T>(values: readonly T[], index: number): T {
  const value = values[index];

  if (value === undefined) {
    throw new Error(`index ${index} out of range`);
  }

  return value;
}

const related = parseMangaRelated(MANGA_RELATED_FIXTURE);

assert(related.length === 2, `two cards are parsed: ${related.length}`);
assert(
  item(related, 0).path === '/library/manga/33514/giant-ojou-sama',
  'the host is stripped from the path',
);
assert(item(related, 0).title === 'Giant Ojou-Sama', 'title comes from the h4');
assert(
  item(related, 0).cover ===
    'https://storage.zonatmo.org/covers/33514_1794932498.webp',
  'cover comes from the inline style',
);
assert(item(related, 0).type === 'manga', 'type comes from data-zt-type');
assert(item(related, 1).type === 'manhwa', 'the second card keeps its own type');
assert(
  item(related, 1).cover ===
    'https://storage2.zonatmo.org/covers/33507_1794884772.webp',
  'an http cover is served over https',
);
assert(
  item(related, 1).title === 'Emperador & Estafa',
  'entities in the title are decoded',
);

assert(parseMangaRelated('').length === 0, 'an empty page has no related');
assert(
  parseMangaRelated('<div class="element-related"></div>').length === 0,
  'an empty carousel has no related',
);

// Links outside /library/ (uploads, tags) are not mangas.
const stray = parseMangaRelated(
  MANGA_RELATED_FIXTURE.replace(
    '/library/manga/33514/giant-ojou-sama',
    '/view_uploads/9',
  ),
);
assert(stray.length === 1, 'a card without a library path is dropped');

// A card missing its h4 would otherwise borrow the next card's title.
const noTitle = parseMangaRelated(
  MANGA_RELATED_FIXTURE.replace(
    /<h4 class="text-truncate" title="Giant Ojou-Sama">[\s\S]*?<\/h4>/,
    '',
  ),
);
assert(noTitle.length === 1, 'a card without a title is dropped');
assert(
  item(noTitle, 0).path === '/library/manhwa/33507/emperador-estafa',
  'the surviving card is the one that still has a title',
);

const noCover = parseMangaRelated(
  MANGA_RELATED_FIXTURE.replace(
    /background-image: url\('https:\/\/storage\.zonatmo\.org[^']*'\);/,
    '',
  ),
);
assert(noCover.length === 1, 'a card without a cover is dropped');

console.log('related mangas ok');
