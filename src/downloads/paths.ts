import { Directory, Paths } from 'expo-file-system';

import { hashKey } from './ownership';

const DOWNLOADS_DIRECTORY = 'downloads';
const READER_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
  'avif',
]);
// FNV-1a collisions between distinct chapter paths are rare; 100 slots make
// exhausting them impossible in practice.
const MAX_SLOTS = 100;

function downloadsRoot(): Directory {
  return new Directory(Paths.document, DOWNLOADS_DIRECTORY);
}

/**
 * Candidate directory names for a chapter, in preference order: the plain
 * hash first, then suffixed slots used when another chapter owns it.
 */
export function chapterDirNames(chapterPath: string): string[] {
  const base = hashKey(chapterPath);

  return Array.from(
    { length: MAX_SLOTS },
    (_, index) => (index === 0 ? base : `${base}-${index + 1}`),
  );
}

export function chapterSlots(chapterPath: string): Directory[] {
  return chapterDirNames(chapterPath).map(
    (name) => new Directory(downloadsRoot(), name),
  );
}

export function pageExtension(url: string): string {
  const pathname = url.split(/[?#]/)[0] ?? '';
  const match = /\.([a-z0-9]+)$/i.exec(pathname);
  const extension = match?.[1]?.toLowerCase();

  if (!extension || !READER_EXTENSIONS.has(extension)) {
    return '.img';
  }

  return extension === 'jpeg' ? '.jpg' : `.${extension}`;
}

export function ensureRoot(): Directory {
  const root = downloadsRoot();
  root.create({ intermediates: true, idempotent: true });

  return root;
}
