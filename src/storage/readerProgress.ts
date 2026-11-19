import AsyncStorage from '@react-native-async-storage/async-storage';

import { withLock } from './serialize';

export type ReaderProgress = {
  chapterPath: string;
  chapterTitle: string;
  page: number;
};

const PROGRESS_PREFIX = 'reader:progress:';
const progressKey = (mangaPath: string) => `${PROGRESS_PREFIX}${mangaPath}`;

function parseProgress(raw: string | null | undefined): ReaderProgress | null {
  if (!raw) {
    return null;
  }

  try {
    const value: unknown = JSON.parse(raw);

    if (typeof value !== 'object' || value === null) {
      return null;
    }

    const record = value as Record<string, unknown>;
    const { chapterPath, chapterTitle, page } = record;

    if (
      typeof chapterPath !== 'string' ||
      typeof chapterTitle !== 'string' ||
      typeof page !== 'number' ||
      !Number.isFinite(page)
    ) {
      return null;
    }

    return {
      chapterPath,
      chapterTitle,
      page: Math.max(0, Math.floor(page)),
    };
  } catch {
    return null;
  }
}

export async function loadProgress(
  mangaPath: string,
): Promise<ReaderProgress | null> {
  try {
    return parseProgress(await AsyncStorage.getItem(progressKey(mangaPath)));
  } catch {
    return null;
  }
}

export async function loadProgressMany(
  mangaPaths: string[],
): Promise<Record<string, ReaderProgress>> {
  try {
    const pairs = await AsyncStorage.multiGet(mangaPaths.map(progressKey));
    const result: Record<string, ReaderProgress> = {};

    for (const [key, raw] of pairs) {
      const progress = parseProgress(raw);

      if (progress) {
        result[key.slice(PROGRESS_PREFIX.length)] = progress;
      }
    }

    return result;
  } catch {
    return {};
  }
}

export async function saveProgress(
  mangaPath: string,
  progress: ReaderProgress,
): Promise<void> {
  try {
    await AsyncStorage.setItem(progressKey(mangaPath), JSON.stringify(progress));
  } catch {
    // Progress is a convenience; a storage failure must not block reading.
  }
}

const readKey = (mangaPath: string) => `reader:read:${mangaPath}`;
const pagePrefix = 'reader:page:';

/** Where one chapter was left, and how long it is. */
export type PageMark = { page: number; total: number };

export const pageProgressKey = (chapterPath: string) =>
  `${pagePrefix}${chapterPath}`;

/** Older builds stored the bare page number; both shapes are read. */
function parsePageMark(raw: string | null | undefined): PageMark | null {
  if (!raw) {
    return null;
  }

  try {
    const value: unknown = JSON.parse(raw);

    if (typeof value === 'number') {
      return Number.isFinite(value)
        ? { page: Math.max(0, Math.floor(value)), total: 0 }
        : null;
    }

    if (typeof value !== 'object' || value === null) {
      return null;
    }

    const { page, total } = value as Record<string, unknown>;

    if (typeof page !== 'number' || typeof total !== 'number') {
      return null;
    }

    return { page: Math.max(0, Math.floor(page)), total: Math.floor(total) };
  } catch {
    return null;
  }
}

/** Page marks of the listed chapters, keyed by chapter path. */
export async function loadPageMarks(
  chapterPaths: string[],
): Promise<Record<string, PageMark>> {
  try {
    const pairs = await AsyncStorage.multiGet(
      chapterPaths.map(pageProgressKey),
    );
    const result: Record<string, PageMark> = {};

    for (const [key, raw] of pairs) {
      const mark = parsePageMark(raw);

      if (mark) {
        result[key.slice(pagePrefix.length)] = mark;
      }
    }

    return result;
  } catch {
    return {};
  }
}

export function savePageMark(
  chapterPath: string,
  mark: PageMark,
): Promise<void> {
  return AsyncStorage.setItem(
    pageProgressKey(chapterPath),
    JSON.stringify(mark),
  ).catch(() => undefined);
}

/** Per-chapter page marks are useless once the files are gone. */
export function forgetPageProgress(chapterPath: string): Promise<void> {
  return AsyncStorage.removeItem(pageProgressKey(chapterPath)).catch(
    () => undefined,
  );
}

export async function loadReadChapters(mangaPath: string): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(readKey(mangaPath));

    if (!raw) {
      return [];
    }

    const value: unknown = JSON.parse(raw);

    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter((item): item is string => typeof item === 'string');
  } catch {
    return [];
  }
}

export function markChapterRead(
  mangaPath: string,
  chapterPath: string,
): Promise<void> {
  return withLock(readKey(mangaPath), async () => {
    try {
      const current = await loadReadChapters(mangaPath);

      if (current.includes(chapterPath)) {
        return;
      }

      await AsyncStorage.setItem(
        readKey(mangaPath),
        JSON.stringify([...current, chapterPath]),
      );
    } catch {
      // Read marks are a convenience; a storage failure must not block reading.
    }
  });
}
