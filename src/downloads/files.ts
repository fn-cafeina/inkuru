import { Directory, File } from 'expo-file-system';

import { isReaderData } from '../source/guards';
import { isChapterDirName } from './ownership';
import { isDownloadRecord } from './types';
import type { DownloadFile, DownloadRecord } from './types';
import {
  chapterSlots,
  ensureRoot,
  existingChapterDirs,
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

/**
 * `undefined` when there is no marker (reusable), `null` when the marker
 * exists but cannot be parsed (ownership unknown, refuse), otherwise the path.
 */
function directoryOwner(
  directory: Directory,
): string | undefined | null {
  const file = new File(directory, READER_FILE);

  if (!file.exists) {
    return undefined;
  }

  try {
    const parsed: unknown = JSON.parse(file.textSync());

    return isDownloadFile(parsed) ? parsed.record.chapterPath : null;
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

    // One retry for transient CDN failures, after a short pause so the CDN
    // can recover; the file is overwritten. downloadFileAsync rejects on
    // non-2xx, so an HTML error page is never stored as an image.
    await new Promise((resolve) => setTimeout(resolve, 500));
    await File.downloadFileAsync(url, destination, {
      idempotent: true,
      signal,
    });
  }
}

export function prepareChapterDirectory(chapterPath: string): Directory {
  let freeSlot: Directory | null = null;
  let blankSlot: Directory | null = null;

  for (const directory of chapterSlots(chapterPath)) {
    if (!directory.exists) {
      freeSlot ??= directory;
      continue;
    }

    const owner = directoryOwner(directory);

    if (owner === chapterPath) {
      wipeDirectory(directory);
      return directory;
    }

    if (owner === undefined) {
      // Interrupted download without marker: reusable under ownership rules.
      blankSlot ??= directory;
    }

    // null (unreadable) or another chapter: never reuse, keep scanning so a
    // slot this chapter already owns is preferred over a free one.
  }

  const target = freeSlot ?? blankSlot;

  if (target) {
    wipeDirectory(target);
    target.create({ intermediates: true, idempotent: true });
    return target;
  }

  // 100 slots all owned by other chapters would need 100 hash collisions.
  throw new Error('download directory collision');
}

function wipeDirectory(directory: Directory) {
  try {
    directory.delete();
  } catch {
    // Recreated by the caller.
  }
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
  const temp = new File(directory, `${READER_FILE}.tmp`);

  temp.create({ overwrite: true });
  await temp.write(JSON.stringify(file));
  // Move only after a full write, so a crash never leaves a 0-byte marker.
  await temp.move(target, { overwrite: true });
}

export async function readDownloadFile(
  chapterPath: string,
): Promise<DownloadFile | null> {
  for (const directory of existingChapterDirs(chapterPath)) {
    const wrapper = await readWrapper(new File(directory, READER_FILE));

    if (wrapper?.record.chapterPath === chapterPath) {
      return wrapper;
    }
  }

  return null;
}

/**
 * Whether a directory with this chapter's marker exists. Markers are parsed
 * (once per record at startup) so a hash collision or an unreadable copy
 * cannot pass as this chapter's files. An unreadable marker counts as absent:
 * the record is dropped from the index and reconcileDirectories sweeps the
 * corrupt directory on the next launch.
 */
export function hasDownloadFiles(chapterPath: string): boolean {
  for (const directory of existingChapterDirs(chapterPath)) {
    if (directoryOwner(directory) === chapterPath) {
      return true;
    }
  }

  return false;
}

/**
 * Clears every directory that might belong to the chapter. Returns false when
 * anything of unknown or possibly-own ownership survives, so the caller keeps
 * the index record instead of losing track of the files.
 */
export function deleteChapterFiles(chapterPath: string): boolean {
  let remaining = false;

  for (const directory of existingChapterDirs(chapterPath)) {
    const owner = directoryOwner(directory);

    if (owner === null) {
      // Unreadable marker: might be this chapter's corrupt copy.
      remaining = true;
      continue;
    }

    if (owner !== undefined && owner !== chapterPath) {
      // Another chapter's directory: not ours to delete.
      continue;
    }

    // Ours, or an interrupted download without marker.

    try {
      const reader = new File(directory, READER_FILE);

      if (reader.exists) {
        reader.delete();
      }
    } catch {
      // If the marker survives, the directory removal below still has a chance.
    }

    try {
      directory.delete();
    } catch {
      // A directory without the marker is swept on the next launch.
      remaining = true;
    }
  }

  return !remaining;
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

    if (!wrapper || !isChapterDirName(wrapper.record.chapterPath, entry.name)) {
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
