import AsyncStorage from '@react-native-async-storage/async-storage';

import { isDownloadRecord } from './types';
import type { DownloadRecord } from './types';

const INDEX_KEY = 'downloads:index';

let records: DownloadRecord[] | null = null;
let tail: Promise<void> = Promise.resolve();

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

function enqueue(operation: () => Promise<void>): Promise<void> {
  const next = tail.then(operation, operation);
  tail = next.catch(() => undefined);

  return next;
}

async function persist(next: DownloadRecord[]): Promise<void> {
  records = next;
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(next)).catch(
    () => undefined,
  );
}

export async function loadDownloadIndex(): Promise<DownloadRecord[]> {
  await tail;

  return [...(await readIndex())];
}

export function upsertRecord(record: DownloadRecord): Promise<void> {
  return enqueue(async () => {
    const current = await readIndex();

    await persist([
      ...current.filter((item) => item.chapterPath !== record.chapterPath),
      record,
    ]);
  });
}

export function removeRecord(chapterPath: string): Promise<void> {
  return enqueue(async () => {
    const current = await readIndex();

    await persist(current.filter((item) => item.chapterPath !== chapterPath));
  });
}
