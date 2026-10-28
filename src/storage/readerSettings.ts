import AsyncStorage from '@react-native-async-storage/async-storage';

export type ReaderMode = 'webtoon' | 'paged-ltr' | 'paged-rtl';
export type ReaderScale =
  | 'fit-screen'
  | 'fit-width'
  | 'fit-height'
  | 'fill'
  | 'original'
  | 'stretch';

export const DEFAULT_READER_MODE: ReaderMode = 'webtoon';
export const DEFAULT_READER_SCALE: ReaderScale = 'fit-screen';

export const READER_MODE_OPTIONS = [
  { value: 'webtoon', label: 'Cascada' },
  { value: 'paged-ltr', label: 'Tradicional' },
  { value: 'paged-rtl', label: 'Manga' },
] as const;

export const READER_SCALE_OPTIONS = [
  { value: 'fit-screen', label: 'Ajustar pantalla' },
  { value: 'fit-width', label: 'Ajustar ancho' },
  { value: 'fit-height', label: 'Ajustar alto' },
  { value: 'fill', label: 'Rellenar (recortar)' },
  { value: 'original', label: 'Tamaño original' },
  { value: 'stretch', label: 'Estirar' },
] as const;

const MODE_KEY = 'reader:mode';
const SCALE_KEY = 'reader:scale';

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
