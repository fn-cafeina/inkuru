import type { MangaChapter } from '@/source/zonatmo';
import type { PageMark } from '@/storage/readerProgress';

const CHAPTER_RANGE_SIZE = 50;

export type ChapterSort = 'asc' | 'desc';

export type ChapterRange = {
  label: string;
  chapters: MangaChapter[];
};

export type ChapterState = 'current' | 'read';

/**
 * The source lists chapters newest first (see the reader adapter contract in
 * source/zonatmo.ts parseReader); ranges are built oldest first.
 */
export function ascendingChapters(chapters: MangaChapter[]): MangaChapter[] {
  return [...chapters].reverse();
}

export function displayChapters(
  chapters: MangaChapter[],
  sort: ChapterSort,
): MangaChapter[] {
  return sort === 'asc' ? chapters : [...chapters].reverse();
}

export function getChapterState(
  chapterPath: string,
  currentPath: string | undefined,
  readChapters: ReadonlySet<string>,
): ChapterState | undefined {
  if (chapterPath === currentPath) {
    return 'current';
  }

  return readChapters.has(chapterPath) ? 'read' : undefined;
}

/**
 * Share of each chapter already read, 0 to 1, for the bar under its row.
 * The saved page wins over the read flag, so going back in a finished chapter
 * shows where you actually are. The flag only fills the bar for a chapter with
 * no page mark, which is every chapter read before marks stored a length.
 */
export function chapterRatios(
  chapters: MangaChapter[],
  readChapters: ReadonlySet<string>,
  marks: Record<string, PageMark>,
): Record<string, number> {
  const ratios: Record<string, number> = {};

  for (const chapter of chapters) {
    const mark = marks[chapter.path];
    const total = mark?.total ?? 0;

    if (mark !== undefined && total > 0 && mark.page > 0) {
      ratios[chapter.path] = Math.min(1, (mark.page + 1) / total);
      continue;
    }

    if (readChapters.has(chapter.path)) {
      ratios[chapter.path] = 1;
    }
  }

  return ratios;
}

/**
 * Where reading continues, in reading order: the chapter saved as progress, or
 * the first unread chapter after it once that one is finished. Nothing left to
 * read yields `undefined`, so the header hides its continue button.
 */
export function nextToRead(
  ascending: MangaChapter[],
  currentPath: string | undefined,
  readChapters: ReadonlySet<string>,
): MangaChapter | undefined {
  if (currentPath === undefined) {
    return undefined;
  }

  const index = ascending.findIndex((chapter) => chapter.path === currentPath);

  if (index < 0) {
    return undefined;
  }

  const start = readChapters.has(currentPath) ? index + 1 : index;

  return ascending.slice(start).find((chapter) => !readChapters.has(chapter.path));
}

export function chunkChapters(chapters: MangaChapter[]): ChapterRange[] {
  const ranges: ChapterRange[] = [];

  for (let start = 0; start < chapters.length; start += CHAPTER_RANGE_SIZE) {
    const slice = chapters.slice(start, start + CHAPTER_RANGE_SIZE);

    ranges.push({ label: rangeLabel(slice, start), chapters: slice });
  }

  return ranges;
}

/** Index of the range holding the chapter, or 0 when it is unknown. */
export function rangeIndexForChapter(
  ranges: ChapterRange[],
  chapterPath: string | undefined,
): number {
  if (!chapterPath) {
    return 0;
  }

  const found = ranges.findIndex((range) =>
    range.chapters.some((chapter) => chapter.path === chapterPath),
  );

  return Math.max(found, 0);
}

function rangeLabel(chapters: MangaChapter[], start: number): string {
  const first = chapterNumber(chapters[0]?.title);
  const last = chapterNumber(chapters[chapters.length - 1]?.title);

  if (first !== undefined && last !== undefined) {
    const low = Math.min(first, last);
    const high = Math.max(first, last);

    return low === high ? `${low}` : `${low}-${high}`;
  }

  return `${start + 1}-${start + chapters.length}`;
}

function chapterNumber(title?: string): number | undefined {
  const match = title?.match(/\d+(?:[.,]\d+)?/);

  return match ? Number(match[0].replace(',', '.')) : undefined;
}
