import AsyncStorage from '@react-native-async-storage/async-storage';

export type ReaderMode = 'webtoon' | 'paged-ltr' | 'paged-rtl';
export type ReaderScale =
  | 'fit-screen'
  | 'fit-width'
  | 'fit-height'
  | 'fill'
  | 'original'
  | 'stretch';
export type ReaderQuality = 'balanced' | 'high' | 'maximum';

export const DEFAULT_READER_MODE: ReaderMode = 'webtoon';
export const DEFAULT_READER_SCALE: ReaderScale = 'fit-screen';
export const DEFAULT_READER_QUALITY: ReaderQuality = 'balanced';

export const READER_MODE_OPTIONS = [
  { value: 'webtoon', label: 'Cascada · Vertical' },
  { value: 'paged-ltr', label: 'Tradicional · Izq→Der' },
  { value: 'paged-rtl', label: 'Manga · Der→Izq' },
] as const;

export const READER_SCALE_OPTIONS = [
  { value: 'fit-screen', label: 'Ajustar pantalla' },
  { value: 'fit-width', label: 'Ajustar ancho' },
  { value: 'fit-height', label: 'Ajustar alto' },
  { value: 'fill', label: 'Rellenar (recortar)' },
  { value: 'original', label: 'Tamaño original' },
  { value: 'stretch', label: 'Estirar' },
] as const;

export const READER_QUALITY_OPTIONS = [
  { value: 'balanced', label: 'Equilibrada' },
  { value: 'high', label: 'Alta' },
  { value: 'maximum', label: 'Máxima' },
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

    return READER_SCALE_OPTIONS.some((option) => option.value === value)
      ? (value as ReaderScale)
      : null;
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

    return READER_QUALITY_OPTIONS.some((option) => option.value === value)
      ? (value as ReaderQuality)
      : null;
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
