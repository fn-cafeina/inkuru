import { readDownloadFile } from './files';
import type { ReaderData } from '@/source/zonatmo';

/**
 * Reader payloads already read from disk. Opening a downloaded chapter used to
 * re-read and re-parse its JSON every time; the files only change when the
 * chapter is downloaded again or deleted.
 */
const LIMIT = 8;
const localReaders = new Map<string, ReaderData>();

export function rememberLocalReader(
  chapterPath: string,
  data: ReaderData,
): void {
  localReaders.delete(chapterPath);
  localReaders.set(chapterPath, data);

  if (localReaders.size > LIMIT) {
    const oldest = localReaders.keys().next().value;

    if (oldest !== undefined) {
      localReaders.delete(oldest);
    }
  }
}

export function forgetLocalReader(chapterPath: string): void {
  localReaders.delete(chapterPath);
}

export async function loadDownloadedReader(
  chapterPath: string,
): Promise<ReaderData | null> {
  const memoized = localReaders.get(chapterPath);

  if (memoized) {
    return memoized;
  }

  const file = await readDownloadFile(chapterPath);

  if (!file) {
    return null;
  }

  rememberLocalReader(chapterPath, file.data);

  return file.data;
}
