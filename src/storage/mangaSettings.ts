import AsyncStorage from '@react-native-async-storage/async-storage';

export type ChapterSort = 'asc' | 'desc';

export const DEFAULT_CHAPTER_SORT: ChapterSort = 'desc';

const SORT_KEY = 'manga:sort';

const rangeKey = (mangaPath: string) => `manga:range:${mangaPath}`;

export async function loadMangaSort(): Promise<ChapterSort | null> {
  try {
    const value = await AsyncStorage.getItem(SORT_KEY);

    return value === 'asc' || value === 'desc' ? value : null;
  } catch {
    return null;
  }
}

export async function saveMangaSort(sort: ChapterSort): Promise<void> {
  try {
    await AsyncStorage.setItem(SORT_KEY, sort);
  } catch {
    // A storage failure must not block browsing.
  }
}

export async function loadMangaRange(
  mangaPath: string,
): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(rangeKey(mangaPath));

    if (!raw) {
      return null;
    }

    const value = Number(raw);

    return Number.isInteger(value) && value >= 0 ? value : null;
  } catch {
    return null;
  }
}

export async function saveMangaRange(
  mangaPath: string,
  index: number,
): Promise<void> {
  try {
    await AsyncStorage.setItem(rangeKey(mangaPath), String(index));
  } catch {
    // A storage failure must not block browsing.
  }
}
