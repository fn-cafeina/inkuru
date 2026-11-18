import AsyncStorage from '@react-native-async-storage/async-storage';

export type ReaderMode = 'webtoon' | 'paged-ltr' | 'paged-rtl';
export type ReaderScale = 'fit-screen' | 'fit-width';
export type ReaderQuality = 'balanced' | 'original';

// Manga reads right to left: paged and right to left is what the pages ask
// for, and a stored value still wins for anyone who picked another mode.
export const DEFAULT_READER_MODE: ReaderMode = 'paged-rtl';
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
const MANGA_OVERRIDES_KEY = 'reader:manga-overrides';

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

// Per-manga overrides, like "this webtoon reads vertical, that one rtl".
// One JSON map so the number of AsyncStorage keys does not grow with the
// library. Quality lives in the global setting: it is a device tradeoff, so
// a stored `quality` field in older overrides is dropped here.
export type MangaReaderOverrides = {
  mode?: ReaderMode;
  scale?: ReaderScale;
};

type OverrideField = 'mode' | 'scale';

function normalizeOverride(entry: unknown): MangaReaderOverrides | null {
  if (typeof entry !== 'object' || entry === null) {
    return null;
  }

  const record = entry as Record<string, unknown>;
  const overrides: MangaReaderOverrides = {};
  const mode = typeof record.mode === 'string' ? MODE_VALUES[record.mode] : undefined;
  const scale =
    typeof record.scale === 'string' ? SCALE_VALUES[record.scale] : undefined;

  if (mode !== undefined) {
    overrides.mode = mode;
  }

  if (scale !== undefined) {
    overrides.scale = scale;
  }

  return Object.keys(overrides).length > 0 ? overrides : null;
}

async function loadOverrideMap(): Promise<Record<string, MangaReaderOverrides>> {
  try {
    const raw = await AsyncStorage.getItem(MANGA_OVERRIDES_KEY);

    if (raw === null) {
      return {};
    }

    const value: unknown = JSON.parse(raw);

    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return {};
    }

    const map: Record<string, MangaReaderOverrides> = {};

    for (const [path, entry] of Object.entries(value)) {
      const overrides = normalizeOverride(entry);

      if (overrides !== null) {
        map[path] = overrides;
      }
    }

    return map;
  } catch {
    return {};
  }
}

export async function loadMangaReaderOverrides(
  mangaPath: string,
): Promise<MangaReaderOverrides | null> {
  const map = await loadOverrideMap();

  return map[mangaPath] ?? null;
}

export async function saveMangaReaderOverride(
  mangaPath: string,
  field: OverrideField,
  value: string,
): Promise<void> {
  try {
    const map = await loadOverrideMap();

    await AsyncStorage.setItem(
      MANGA_OVERRIDES_KEY,
      JSON.stringify({
        ...map,
        [mangaPath]: { ...(map[mangaPath] ?? {}), [field]: value },
      }),
    );
  } catch {
    // A storage failure must not block reading.
  }
}