/**
 * Whether being on `page` counts as finishing the chapter: the last page of the
 * chapter is the finish line, however the reader got there. Landing on it by a
 * forward move, by a jump, or by restoring a saved position all mean the same,
 * and a one-page chapter is finished as soon as its only page is shown.
 */
export function reachesLastPage(page: number, total: number): boolean {
  return total > 0 && page >= total - 1;
}
