import {
  ascendingChapters,
  chunkChapters,
  displayChapters,
  getChapterState,
  rangeIndexForChapter,
} from './chapters';
import type { MangaChapter } from '../../source/zonatmo';

function assertEqual<T>(actual: T, expected: T, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

function chapter(number: number): MangaChapter {
  return { title: `Capítulo ${number}`, path: `/view_uploads/${number}` };
}

function range(size: number, from = 1): MangaChapter[] {
  return Array.from({ length: size }, (_, index) => chapter(from + index));
}

const newestFirst = range(3).reverse();

assertEqual(
  ascendingChapters(newestFirst).map((item) => item.path).join(),
  range(3).map((item) => item.path).join(),
  'ascending order inverts newest first',
);
assertEqual(
  displayChapters(range(3), 'asc')[0]?.path,
  chapter(1).path,
  'asc keeps the received order',
);
assertEqual(
  displayChapters(range(3), 'desc')[0]?.path,
  chapter(3).path,
  'desc inverts',
);

assertEqual(chunkChapters([]).length, 0, 'no chapters means no ranges');

const single = chunkChapters([chapter(7)]);

assertEqual(single.length, 1, 'one chapter forms a range');
assertEqual(single[0]?.label, '7', 'a single chapter uses its number');

const decimal = chunkChapters([{ title: 'Capítulo 12,5', path: '/x' }]);

assertEqual(decimal[0]?.label, '12.5', 'a decimal comma is accepted');

const unnumbered = chunkChapters([{ title: 'Extra', path: '/x' }]);

assertEqual(unnumbered[0]?.label, '1-1', 'without numbers the position is used');

const ranges = chunkChapters(range(120));

assertEqual(ranges.length, 3, '120 chapters form 3 ranges');
assertEqual(ranges[0]?.chapters.length, 50, 'the first range is full');
assertEqual(ranges[2]?.chapters.length, 20, 'the last range carries the rest');
assertEqual(ranges[0]?.label, '1-50', 'the first range label');
assertEqual(ranges[1]?.label, '51-100', 'the middle range label');
assertEqual(ranges[2]?.label, '101-120', 'the last range label');

assertEqual(
  rangeIndexForChapter(ranges, chapter(51).path),
  1,
  'chapter 51 falls in the middle range',
);
assertEqual(
  rangeIndexForChapter(ranges, undefined),
  0,
  'without progress the first range shows',
);
assertEqual(
  rangeIndexForChapter(ranges, '/missing'),
  0,
  'a chapter off the list returns to the first range',
);

const read = new Set(['/view_uploads/1']);

assertEqual(
  getChapterState('/view_uploads/1', '/view_uploads/1', read),
  'current',
  'the current chapter beats read',
);
assertEqual(
  getChapterState('/view_uploads/1', '/view_uploads/2', read),
  'read',
  'a read chapter is marked',
);
assertEqual(
  getChapterState('/view_uploads/3', '/view_uploads/2', read),
  undefined,
  'an unmarked chapter has no state',
);

console.log('chapter ranges ok');
