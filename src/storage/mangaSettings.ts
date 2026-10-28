import AsyncStorage from '@react-native-async-storage/async-storage';

export type ChapterSort = 'asc' | 'desc';

export const DEFAULT_CHAPTER_SORT: ChapterSort = 'desc';

const SORT_KEY = 'manga:sort';

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
