import AsyncStorage from '@react-native-async-storage/async-storage';

import { withLock } from '@/storage/serialize';
import { isDownloadRecord } from './types';
import type { DownloadRecord } from './types';

const INDEX_KEY = 'downloads:index';

/**
 * The index on disk, read on every call. There is no memory copy here on
 * purpose: `store.records` is the in-memory view the UI subscribes to, and a
 * second list that had to be kept in step with it was one missed update away
 * from deciding "keep this manga for offline" on stale data.
 */
async function readIndex(): Promise<DownloadRecord[]> {
  const raw = await AsyncStorage.getItem(INDEX_KEY).catch(() => null);

  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    return Array.isArray(parsed) ? parsed.filter(isDownloadRecord) : [];
  } catch {
    return [];
  }
}

function persist(next: DownloadRecord[]): Promise<void> {
  return AsyncStorage.setItem(INDEX_KEY, JSON.stringify(next)).catch(
    () => undefined,
  );
}

export async function loadDownloadIndex(): Promise<DownloadRecord[]> {
  // Wait for pending writes before reading the index.
  await withLock(INDEX_KEY, async () => undefined);

  return [...(await readIndex())];
}

/** Whether any chapter of the manga is on disk, so it has to stay reachable. */
export async function hasDownloadsFor(mangaPath: string): Promise<boolean> {
  return (await loadDownloadIndex()).some(
    (record) => record.mangaPath === mangaPath,
  );
}

export function upsertRecord(record: DownloadRecord): Promise<void> {
  return withLock(INDEX_KEY, async () => {
    const current = await readIndex();

    await persist([
      ...current.filter((item) => item.chapterPath !== record.chapterPath),
      record,
    ]);
  });
}

export function removeRecord(chapterPath: string): Promise<void> {
  return withLock(INDEX_KEY, async () => {
    const current = await readIndex();

    await persist(current.filter((item) => item.chapterPath !== chapterPath));
  });
}
