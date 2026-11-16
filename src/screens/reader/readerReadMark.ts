export type PageMark = { path: string; page: number };

/**
 * Whether landing on `page` in `path` counts as finishing the chapter. Only a
 * forward move into the last page counts: the page restored from storage is
 * not a finish, and moving back over the last page is not either.
 */
export function reachesLastPage(
  prev: PageMark | null,
  path: string,
  page: number,
  total: number,
): boolean {
  return (
    total > 0 &&
    page >= total - 1 &&
    prev !== null &&
    prev.path === path &&
    page > prev.page
  );
}
