/**
 * A directory without a stored owner can be reused; another chapter's cannot.
 * `null` means the marker exists but cannot be read, so ownership is unknown
 * and the directory must not be deleted or reused.
 */
export function ownsChapterPath(
  chapterPath: string,
  storedPath: string | undefined | null,
): boolean {
  if (storedPath === null) {
    return false;
  }

  return storedPath === undefined || storedPath === chapterPath;
}
