import AsyncStorage from '@react-native-async-storage/async-storage';

import { withLock } from '../storage/serialize';
import { isDownloadRecord } from './types';
import type { DownloadRecord } from './types';

const INDEX_KEY = 'downloads:index';

let records: DownloadRecord[] | null = null;

async function readIndex(): Promise<DownloadRecord[]> {
  if (records) {
    return records;
  }

  const raw = await AsyncStorage.getItem(INDEX_KEY).catch(() => null);

  if (!raw) {
    records = [];
    return records;
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    records = Array.isArray(parsed) ? parsed.filter(isDownloadRecord) : [];
  } catch {
    records = [];
  }

  return records;
}

async function persist(next: DownloadRecord[]): Promise<void> {
  records = next;
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(next)).catch(
    () => undefined,
  );
}

export async function loadDownloadIndex(): Promise<DownloadRecord[]> {
  // Wait for pending writes before reading the index.
  await withLock(INDEX_KEY, async () => undefined);

  return [...(await readIndex())];
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
