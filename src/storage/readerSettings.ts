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
  { value: 'balanced', label: 'Equilibrada' },
  { value: 'original', label: 'Máxima' },
] as const;

const MODE_KEY = 'reader:mode';
const SCALE_KEY = 'reader:scale';
const QUALITY_KEY = 'reader:quality';
const KEEP_AWAKE_KEY = 'reader:keepAwake';

// Stored values accepted as-is or mapped to their current name: the mode
// split and the older scale/quality synonyms.
const MODE_VALUES: Record<string, ReaderMode> = {
  webtoon: 'webtoon',
  'paged-ltr': 'paged-ltr',
  'paged-rtl': 'paged-rtl',
  vertical: 'webtoon',
  paged: 'paged-rtl',
};

const SCALE_VALUES: Record<string, ReaderScale> = {
  'fit-screen': 'fit-screen',
  'fit-width': 'fit-width',
  'fit-height': 'fit-screen',
  fill: 'fit-screen',
  original: 'fit-screen',
  stretch: 'fit-screen',
};

const QUALITY_VALUES: Record<string, ReaderQuality> = {
  balanced: 'balanced',
  original: 'original',
  high: 'original',
  maximum: 'original',
};

const KEEP_AWAKE_VALUES: Record<string, boolean> = {
  true: true,
  false: false,
};

/** Stored value in its current name; null when missing or unknown. */
async function loadSetting<T>(
  key: string,
  values: Record<string, T>,
): Promise<T | null> {
  try {
    const value = await AsyncStorage.getItem(key);

    return value === null ? null : (values[value] ?? null);
  } catch {
    return null;
  }
}

async function saveSetting(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, value);
  } catch {
    // A storage failure must not block reading.
  }
}

export function loadReaderMode(): Promise<ReaderMode | null> {
  return loadSetting(MODE_KEY, MODE_VALUES);
}

export function saveReaderMode(mode: ReaderMode): Promise<void> {
  return saveSetting(MODE_KEY, mode);
}

export function loadReaderScale(): Promise<ReaderScale | null> {
  return loadSetting(SCALE_KEY, SCALE_VALUES);
}

export function saveReaderScale(scale: ReaderScale): Promise<void> {
  return saveSetting(SCALE_KEY, scale);
}

export function loadReaderQuality(): Promise<ReaderQuality | null> {
  return loadSetting(QUALITY_KEY, QUALITY_VALUES);
}

export function saveReaderQuality(quality: ReaderQuality): Promise<void> {
  return saveSetting(QUALITY_KEY, quality);
}

export async function loadKeepAwake(): Promise<boolean> {
  return (await loadSetting(KEEP_AWAKE_KEY, KEEP_AWAKE_VALUES)) ?? true;
}

export function saveKeepAwake(keepAwake: boolean): Promise<void> {
  return saveSetting(KEEP_AWAKE_KEY, String(keepAwake));
}