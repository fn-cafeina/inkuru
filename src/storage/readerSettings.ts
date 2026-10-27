import AsyncStorage from '@react-native-async-storage/async-storage';

export type ReaderMode = 'vertical' | 'paged';

const MODE_KEY = 'reader:mode';

export async function loadReaderMode(): Promise<ReaderMode | null> {
  try {
    const value = await AsyncStorage.getItem(MODE_KEY);

    return value === 'vertical' || value === 'paged' ? value : null;
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
