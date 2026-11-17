import type { LibraryEntry } from '../../storage/library';
import type { ReaderProgress } from '../../storage/readerProgress';

/** Title match for the library search; case and accents are ignored. */
export function matchesQuery(title: string, query: string): boolean {
  const normalize = (value: string) =>
    value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  const needle = normalize(query.trim());

  return needle.length === 0 || normalize(title).includes(needle);
}

/**
 * Titles with reading progress first, then the rest: "continue reading" is
 * the reason the tab exists. Within each group the most recently saved comes
 * first; progress has no timestamp, so the save order is the only signal.
 */
export function orderLibrary(
  entries: LibraryEntry[],
  progress: Record<string, ReaderProgress>,
): LibraryEntry[] {
  const byAdded = (a: LibraryEntry, b: LibraryEntry) => b.addedAt - a.addedAt;
  const read = entries.filter((entry) => progress[entry.path] !== undefined);
  const unread = entries.filter((entry) => progress[entry.path] === undefined);

  return [...read.sort(byAdded), ...unread.sort(byAdded)];
}

/**
 * Whether a reload returned the same entries. Replacing the array with an
 * equal one re-renders the whole grid on every focus for no reason.
 */
export function sameEntries(
  a: LibraryEntry[],
  b: LibraryEntry[],
): boolean {
  return (
    a.length === b.length &&
    a.every((entry, index) => {
      const other = b[index];

      return (
        other !== undefined &&
        entry.path === other.path &&
        entry.title === other.title &&
        entry.cover === other.cover &&
        entry.addedAt === other.addedAt
      );
    })
  );
}

/** Same paths and page numbers, ignoring object identity. */
export function sameProgress(
  a: Record<string, ReaderProgress>,
  b: Record<string, ReaderProgress>,
): boolean {
  const keys = Object.keys(a);

  return (
    keys.length === Object.keys(b).length &&
    keys.every((key) => {
      const left = a[key];
      const right = b[key];

      return (
        left !== undefined &&
        right !== undefined &&
        left.chapterPath === right.chapterPath &&
        left.chapterTitle === right.chapterTitle &&
        left.page === right.page
      );
    })
  );
}
