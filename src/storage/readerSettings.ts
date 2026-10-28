import AsyncStorage from '@react-native-async-storage/async-storage';

export type ReaderMode = 'webtoon' | 'paged-ltr' | 'paged-rtl';

export const DEFAULT_READER_MODE: ReaderMode = 'webtoon';

export const READER_MODE_OPTIONS = [
  { value: 'webtoon', label: 'Cascada' },
  { value: 'paged-ltr', label: 'Tradicional' },
  { value: 'paged-rtl', label: 'Manga' },
] as const;

const MODE_KEY = 'reader:mode';

export async function loadReaderMode(): Promise<ReaderMode | null> {
  try {
    const value = await AsyncStorage.getItem(MODE_KEY);

    // `vertical` and `paged` are the pre-mode-split values.
    if (value === 'vertical' || value === 'webtoon') {
      return 'webtoon';
    }

    if (value === 'paged' || value === 'paged-rtl') {
      return 'paged-rtl';
    }

    return value === 'paged-ltr' ? 'paged-ltr' : null;
  } catch {
    return null;
  }
}

export async function saveReaderMode(mode: ReaderMode): Promise<void> {
  try {
    await AsyncStorage.setItem(MODE_KEY, mode);
  } catch {
    // A storage failure must not block reading.
  }
}
