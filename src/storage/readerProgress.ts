import AsyncStorage from '@react-native-async-storage/async-storage';

export type ReaderProgress = {
  chapterPath: string;
  chapterTitle: string;
  page: number;
};

const progressKey = (mangaPath: string) => `reader:progress:${mangaPath}`;

export async function loadProgress(
  mangaPath: string,
): Promise<ReaderProgress | null> {
  try {
    const raw = await AsyncStorage.getItem(progressKey(mangaPath));

    if (!raw) {
      return null;
    }

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
