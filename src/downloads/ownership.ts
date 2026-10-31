/** A directory without a stored owner can be reused; another chapter's cannot. */
export function ownsChapterPath(
  chapterPath: string,
  storedPath: string | undefined,
): boolean {
  return storedPath === undefined || storedPath === chapterPath;
}
