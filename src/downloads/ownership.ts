/** Stable, filesystem-safe 32-bit FNV-1a fingerprint of a chapter path. */
export function hashKey(value: string): string {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}

/** Whether a directory name is the chapter's, including collision suffixes. */
export function isChapterDirName(chapterPath: string, name: string): boolean {
  const base = hashKey(chapterPath);

  if (name === base) {
    return true;
  }

  const suffix = name.startsWith(`${base}-`)
    ? name.slice(base.length + 1)
    : '';

  return /^\d+$/.test(suffix);
}
