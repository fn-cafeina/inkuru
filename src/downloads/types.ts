import type { ReaderData } from '../source/zonatmo';

export type DownloadStatus = 'queued' | 'downloading' | 'done' | 'failed';

export type DownloadState = {
  status: DownloadStatus;
  page: number;
  total: number;
};

export type DownloadInput = {
  chapterPath: string;
  chapterTitle: string;
  mangaPath: string;
  mangaTitle: string;
};

export type DownloadRecord = DownloadInput & {
  pageCount: number;
  completedAt: number;
};

export type DownloadFile = {
  version: 1;
  record: DownloadRecord;
  data: ReaderData;
};

export function isDownloadRecord(value: unknown): value is DownloadRecord {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.chapterPath === 'string' &&
    typeof record.chapterTitle === 'string' &&
    typeof record.mangaPath === 'string' &&
    typeof record.mangaTitle === 'string' &&
    typeof record.pageCount === 'number' &&
    Number.isFinite(record.pageCount) &&
    typeof record.completedAt === 'number' &&
    Number.isFinite(record.completedAt)
  );
}
