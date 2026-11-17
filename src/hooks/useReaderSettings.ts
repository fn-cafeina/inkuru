import { useCallback, useState } from 'react';

import {
  DEFAULT_READER_MODE,
  DEFAULT_READER_QUALITY,
  DEFAULT_READER_SCALE,
  loadKeepAwake,
  loadMangaReaderOverrides,
  loadReaderMode,
  loadReaderQuality,
  loadReaderScale,
  saveKeepAwake,
  saveMangaReaderOverride,
  saveReaderMode,
  saveReaderQuality,
  saveReaderScale,
} from '../storage/readerSettings';
import type {
  MangaReaderOverrides,
  ReaderMode,
  ReaderQuality,
  ReaderScale,
} from '../storage/readerSettings';

// Last values for the next mount (chapter switch, tab focus) while AsyncStorage
// resolves. keepAwake starts at the storage default so a focus reload does not
// flash the switch when the stored value is false.
let cachedMode: ReaderMode = DEFAULT_READER_MODE;
let cachedScale: ReaderScale = DEFAULT_READER_SCALE;
let cachedQuality: ReaderQuality = DEFAULT_READER_QUALITY;
let cachedKeepAwake = true;

// The reader is one screen, so one cached override set, keyed by its manga.
let cachedOverridesPath: string | null = null;
let cachedOverrides: MangaReaderOverrides | null = null;

function rememberOverrideFor(
  path: string,
  overrides: MangaReaderOverrides,
): void {
  cachedOverridesPath = path;
  cachedOverrides = overrides;
}

/**
 * Shared load/select state for the four reader preferences. When a mangaPath is
 * given, selects write per-manga overrides on top of the global values.
 * The keep-awake activation itself stays in useReaderPreferences, where the
 * reader owns it.
 */
export function useReaderSettings(mangaPath?: string) {
  const [mode, setMode] = useState<ReaderMode>(cachedMode);
  const [scale, setScale] = useState<ReaderScale>(cachedScale);
  const [quality, setQuality] = useState<ReaderQuality>(cachedQuality);
  const [keepAwake, setKeepAwake] = useState(cachedKeepAwake);
  const [loaded, setLoaded] = useState(false);

  const restore = useCallback(async (isActive: () => boolean = () => true) => {
    const [storedMode, storedScale, storedQuality, storedKeepAwake, overrides] =
      await Promise.all([
        loadReaderMode(),
        loadReaderScale(),
        loadReaderQuality(),
        loadKeepAwake(),
        mangaPath ? loadMangaReaderOverrides(mangaPath) : Promise.resolve(null),
      ]);

    if (!isActive()) {
      return;
    }

    if (storedMode) {
      cachedMode = storedMode;
      setMode(storedMode);
    }

    if (storedScale) {
      cachedScale = storedScale;
      setScale(storedScale);
    }

    if (storedQuality) {
      cachedQuality = storedQuality;
      setQuality(storedQuality);
    }

    cachedKeepAwake = storedKeepAwake;
    setKeepAwake(storedKeepAwake);

    // Per-manga overrides beat the global values.
    if (mangaPath !== undefined && overrides !== null) {
      cachedOverridesPath = mangaPath;
      cachedOverrides = overrides;

      if (overrides.mode !== undefined) {
        cachedMode = overrides.mode;
        setMode(overrides.mode);
      }

      if (overrides.scale !== undefined) {
        cachedScale = overrides.scale;
        setScale(overrides.scale);
      }

      if (overrides.quality !== undefined) {
        cachedQuality = overrides.quality;
        setQuality(overrides.quality);
      }
    }

    setLoaded(true);
  }, [mangaPath]);

  const selectMode = useCallback((next: ReaderMode) => {
    cachedMode = next;
    setMode(next);

    if (mangaPath !== undefined) {
      rememberOverrideFor(mangaPath, {
        ...(cachedOverridesPath === mangaPath ? cachedOverrides ?? {} : {}),
        mode: next,
      });
      void saveMangaReaderOverride(mangaPath, 'mode', next);
      return;
    }

    void saveReaderMode(next);
  }, [mangaPath]);

  const selectScale = useCallback((next: ReaderScale) => {
    cachedScale = next;
    setScale(next);

    if (mangaPath !== undefined) {
      rememberOverrideFor(mangaPath, {
        ...(cachedOverridesPath === mangaPath ? cachedOverrides ?? {} : {}),
        scale: next,
      });
      void saveMangaReaderOverride(mangaPath, 'scale', next);
      return;
    }

    void saveReaderScale(next);
  }, [mangaPath]);

  const selectQuality = useCallback((next: ReaderQuality) => {
    cachedQuality = next;
    setQuality(next);

    if (mangaPath !== undefined) {
      rememberOverrideFor(mangaPath, {
        ...(cachedOverridesPath === mangaPath ? cachedOverrides ?? {} : {}),
        quality: next,
      });
      void saveMangaReaderOverride(mangaPath, 'quality', next);
      return;
    }

    void saveReaderQuality(next);
  }, [mangaPath]);

  const selectKeepAwake = useCallback((next: boolean) => {
    cachedKeepAwake = next;
    setKeepAwake(next);
    void saveKeepAwake(next);
  }, []);

  return {
    mode,
    scale,
    quality,
    keepAwake,
    loaded,
    restore,
    selectMode,
    selectScale,
    selectQuality,
    selectKeepAwake,
  };
}
