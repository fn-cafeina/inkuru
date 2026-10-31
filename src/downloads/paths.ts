import { Directory, Paths } from 'expo-file-system';

const DOWNLOADS_DIRECTORY = 'downloads';
const READER_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
  'avif',
]);

/** Stable, filesystem-safe folder name for a chapter path. */
export function hashKey(value: string): string {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function downloadsRoot(): Directory {
  return new Directory(Paths.document, DOWNLOADS_DIRECTORY);
}

export function chapterDirectory(chapterPath: string): Directory {
  return new Directory(downloadsRoot(), hashKey(chapterPath));
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
