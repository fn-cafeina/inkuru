import AsyncStorage from '@react-native-async-storage/async-storage';

export type ReaderMode = 'webtoon' | 'paged-ltr' | 'paged-rtl';
export type ReaderScale = 'fit-screen' | 'fit-width';
export type ReaderQuality = 'balanced' | 'original';

export const DEFAULT_READER_MODE: ReaderMode = 'webtoon';
export const DEFAULT_READER_SCALE: ReaderScale = 'fit-screen';
export const DEFAULT_READER_QUALITY: ReaderQuality = 'balanced';

export const READER_MODE_OPTIONS = [
  { value: 'webtoon', label: 'Vertical' },
  { value: 'paged-ltr', label: 'Izquierda a derecha' },
  { value: 'paged-rtl', label: 'Derecha a izquierda' },
] as const;

export const READER_SCALE_OPTIONS = [
  { value: 'fit-screen', label: 'Ajustar pantalla' },
  { value: 'fit-width', label: 'Ajustar ancho' },
] as const;

export const READER_QUALITY_OPTIONS = [
  { value: 'balanced', label: 'Normal' },
  { value: 'original', label: 'Original' },
] as const;

const MODE_KEY = 'reader:mode';
const SCALE_KEY = 'reader:scale';
const QUALITY_KEY = 'reader:quality';

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

export async function loadReaderScale(): Promise<ReaderScale | null> {
  try {
    const value = await AsyncStorage.getItem(SCALE_KEY);

    if (value === 'fit-width') {
      return 'fit-width';
    }

    if (
      value === 'fit-screen' ||
      value === 'fit-height' ||
      value === 'fill' ||
      value === 'original' ||
      value === 'stretch'
    ) {
      return 'fit-screen';
    }

    return null;
  } catch {
    return null;
  }
}

export async function saveReaderScale(scale: ReaderScale): Promise<void> {
  try {
    await AsyncStorage.setItem(SCALE_KEY, scale);
  } catch {
    // A storage failure must not block reading.
  }
}

export async function loadReaderQuality(): Promise<ReaderQuality | null> {
  try {
    const value = await AsyncStorage.getItem(QUALITY_KEY);

    if (value === 'balanced') {
      return 'balanced';
    }

    if (value === 'high' || value === 'maximum' || value === 'original') {
      return 'original';
    }

    return null;
  } catch {
    return null;
  }
}

export async function saveReaderQuality(
  quality: ReaderQuality,
): Promise<void> {
  try {
    await AsyncStorage.setItem(QUALITY_KEY, quality);
  } catch {
    // A storage failure must not block reading.
  }
}

const KEEP_AWAKE_KEY = 'reader:keepAwake';

export async function loadKeepAwake(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(KEEP_AWAKE_KEY);

    return value === null ? true : value === 'true';
  } catch {
    return true;
  }
}

export async function saveKeepAwake(keepAwake: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(KEEP_AWAKE_KEY, String(keepAwake));
  } catch {
    // A storage failure must not block reading.
  }
}
