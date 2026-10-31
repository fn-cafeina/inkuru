import type { MangaChapter } from '../../source/zonatmo';

const CHAPTER_RANGE_SIZE = 50;

export type ChapterSort = 'asc' | 'desc';

export type ChapterRange = {
  label: string;
  chapters: MangaChapter[];
};

export type ChapterState = 'current' | 'read';

/** The source lists chapters newest first; ranges are built oldest first. */
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

export function chunkChapters(chapters: MangaChapter[]): ChapterRange[] {
  const ranges: ChapterRange[] = [];

  for (let start = 0; start < chapters.length; start += CHAPTER_RANGE_SIZE) {
    const slice = chapters.slice(start, start + CHAPTER_RANGE_SIZE);

    ranges.push({ label: rangeLabel(slice, start), chapters: slice });
  }

  return ranges;
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
