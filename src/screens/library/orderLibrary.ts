import type { LibraryEntry } from '../../storage/library';
import type { ReaderProgress } from '../../storage/readerProgress';

/**
 * Explicit saves first (newest first), then titles that only have reading
 * progress. Within each group the most recently read comes first, because
 * "continue reading" is the reason the tab exists; progress has no timestamp,
 * so the array order is what the library was loaded in.
 */
/** Title match for the library search; case and accents are ignored. */
export function matchesQuery(title: string, query: string): boolean {
  const normalize = (value: string) =>
    value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  const needle = normalize(query.trim());

  return needle.length === 0 || normalize(title).includes(needle);
}

export function orderLibrary(
  entries: LibraryEntry[],
  progress: Record<string, ReaderProgress>,
): LibraryEntry[] {
  const byAdded = (a: LibraryEntry, b: LibraryEntry) => b.addedAt - a.addedAt;
  const read = entries.filter((entry) => progress[entry.path] !== undefined);
  const unread = entries.filter((entry) => progress[entry.path] === undefined);

  return [...read.sort(byAdded), ...unread.sort(byAdded)];
}
