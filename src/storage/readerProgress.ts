import AsyncStorage from '@react-native-async-storage/async-storage';

import { withLock } from './serialize';

/**
 * Where reading stopped in a manga: which chapter, nothing about the page.
 * The page lives in the chapter's own mark, so the two cannot disagree.
 */
export type ReaderProgress = {
  chapterPath: string;
  chapterTitle: string;
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
    const { chapterPath, chapterTitle } = record;

    if (typeof chapterPath !== 'string' || typeof chapterTitle !== 'string') {
      return null;
    }

    // Older builds also stored a page here; the field is ignored, not migrated.
    return { chapterPath, chapterTitle };
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

/** Where one chapter was left, how long it is, and when it was written. */
export type PageMark = { page: number; total: number; savedAt?: number };

// Marks are one key per chapter ever opened, so the store needs a ceiling of
// its own: the query cache has bytes and the downloads have an index, this has
// nothing. Old marks lose their bar and reopen the chapter at the start.
const MAX_PAGE_MARKS = 500;

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

    const { page, total, savedAt } = value as Record<string, unknown>;

    if (typeof page !== 'number' || typeof total !== 'number') {
      return null;
    }

    return {
      page: Math.max(0, Math.floor(page)),
      total: Math.floor(total),
      // Stamped from the first build that swept; older marks count as oldest.
      savedAt: typeof savedAt === 'number' && Number.isFinite(savedAt)
        ? savedAt
        : 0,
    };
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
    JSON.stringify({ ...mark, savedAt: Date.now() }),
  ).catch(() => undefined);
}

/**
 * Keeps the newest `MAX_PAGE_MARKS` marks and deletes the rest. One sweep per
 * launch: the alternative is a `getAllKeys` per saved page, on the JS thread,
 * every time a page turns.
 */
export async function sweepPageMarks(): Promise<void> {
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((key) =>
      key.startsWith(pagePrefix),
    );

    if (keys.length <= MAX_PAGE_MARKS) {
      return;
    }

    const pairs = await AsyncStorage.multiGet(keys);
    const marks = pairs
      .map(([key, raw]) => ({ key, mark: parsePageMark(raw) }))
      .sort((a, b) => (b.mark?.savedAt ?? 0) - (a.mark?.savedAt ?? 0));
    const stale = marks.slice(MAX_PAGE_MARKS).map((entry) => entry.key);

    await AsyncStorage.multiRemove(stale);
  } catch {
    // Losing a mark costs a scroll, not the read.
  }
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
  return writeReadList(mangaPath, (current) => [...current, chapterPath], (current) =>
    current.includes(chapterPath),
  );
}

/**
 * A chapter that was finished and then left before its end stops counting as
 * read: the continue button and the library order follow where reading
 * actually stopped, not the best page ever reached.
 */
export function unmarkChapterRead(
  mangaPath: string,
  chapterPath: string,
): Promise<void> {
  return writeReadList(
    mangaPath,
    (current) => current.filter((item) => item !== chapterPath),
    (current) => !current.includes(chapterPath),
  );
}

function writeReadList(
  mangaPath: string,
  next: (current: string[]) => string[],
  settled: (current: string[]) => boolean,
): Promise<void> {
  return withLock(readKey(mangaPath), async () => {
    try {
      const current = await loadReadChapters(mangaPath);

      if (settled(current)) {
        return;
      }

      await AsyncStorage.setItem(readKey(mangaPath), JSON.stringify(next(current)));
    } catch {
      // Read marks are a convenience; a storage failure must not block reading.
    }
  });
}
