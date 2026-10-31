import { Directory, File } from 'expo-file-system';

import { isReaderData } from '../source/guards';
import { isDownloadRecord } from './types';
import type { DownloadFile, DownloadRecord } from './types';
import {
  chapterDirectory,
  ensureRoot,
  hashKey,
  pageExtension,
} from './paths';

const READER_FILE = 'reader.json';

function isDownloadFile(value: unknown): value is DownloadFile {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const file = value as Record<string, unknown>;

  return (
    file.version === 1 && isDownloadRecord(file.record) && isReaderData(file.data)
  );
}

async function readWrapper(target: File): Promise<DownloadFile | null> {
  try {
    const parsed: unknown = JSON.parse(await target.text());

    return isDownloadFile(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function downloadPage(
  url: string,
  destination: File,
  signal: AbortSignal,
): Promise<void> {
  try {
    await File.downloadFileAsync(url, destination, {
      idempotent: true,
      signal,
    });
  } catch (error) {
    if (signal.aborted) {
      throw error;
    }

    // One retry for transient CDN failures; the file is overwritten.
    await File.downloadFileAsync(url, destination, {
      idempotent: true,
      signal,
    });
  }
}

export function prepareChapterDirectory(chapterPath: string): Directory {
  const directory = chapterDirectory(chapterPath);

  if (directory.exists) {
    try {
      directory.delete();
    } catch {
      // Recreated below.
    }
  }

  directory.create({ intermediates: true, idempotent: true });

  return directory;
}

export function pageFile(
  directory: Directory,
  index: number,
  url: string,
): File {
  const name = `${String(index + 1).padStart(3, '0')}${pageExtension(url)}`;

  return new File(directory, name);
}

export async function writeDownloadFile(
  directory: Directory,
  file: DownloadFile,
): Promise<void> {
  const target = new File(directory, READER_FILE);

  target.create({ overwrite: true });
  await target.write(JSON.stringify(file));
}

export async function readDownloadFile(
  chapterPath: string,
): Promise<DownloadFile | null> {
  const directory = chapterDirectory(chapterPath);

  if (!directory.exists) {
    return null;
  }

  const wrapper = await readWrapper(new File(directory, READER_FILE));

  if (!wrapper || wrapper.record.chapterPath !== chapterPath) {
    return null;
  }

  return wrapper;
}

export function hasDownloadFiles(chapterPath: string): boolean {
  const directory = chapterDirectory(chapterPath);

  return directory.exists && new File(directory, READER_FILE).exists;
}

export function deleteChapterFiles(chapterPath: string) {
  const directory = chapterDirectory(chapterPath);

  if (!directory.exists) {
    return;
  }

  try {
    directory.delete();
  } catch {
    // The manager will mark the chapter as failed and retry later.
  }
}

/** Remove interrupted downloads and recover completed ones missing from the index. */
export async function reconcileDirectories(
  knownDirs: Set<string>,
): Promise<DownloadRecord[]> {
  const recovered: DownloadRecord[] = [];

  for (const entry of ensureRoot().list()) {
    if (!(entry instanceof Directory)) {
      continue;
    }

    const file = new File(entry, READER_FILE);

    if (!file.exists) {
      try {
        entry.delete();
      } catch {
        // Ignore: it will be retried on the next launch.
      }
      continue;
    }

    if (knownDirs.has(entry.name)) {
      continue;
    }

    const wrapper = await readWrapper(file);

    if (!wrapper || hashKey(wrapper.record.chapterPath) !== entry.name) {
      try {
        entry.delete();
      } catch {
        // Ignore invalid leftovers.
      }
      continue;
    }

    recovered.push(wrapper.record);
  }

  return recovered;
}
