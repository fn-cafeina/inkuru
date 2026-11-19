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
} from '@/storage/readerSettings';
import { resolveReaderValues } from '@/storage/readerOverrides';
import type {
  MangaReaderOverrides,
  ReaderMode,
  ReaderQuality,
  ReaderScale,
} from '@/storage/readerSettings';

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

    // The module cache holds global settings only. A manga override is resolved
    // per mount: leaving it in the cache made the next title open with the
    // previous title's mode, since nothing else overwrote it when the user had
    // never saved a global value.
    const global = {
      mode: storedMode ?? cachedMode,
      scale: storedScale ?? cachedScale,
      quality: storedQuality ?? cachedQuality,
    };

    cachedMode = global.mode;
    cachedScale = global.scale;
    cachedQuality = global.quality;

    if (mangaPath !== undefined && overrides !== null) {
      rememberOverrideFor(mangaPath, overrides);
    }

    const values = resolveReaderValues(
      global,
      mangaPath === undefined ? null : overrides,
    );

    setMode(values.mode);
    setScale(values.scale);
    setQuality(values.quality);
    cachedKeepAwake = storedKeepAwake;
    setKeepAwake(storedKeepAwake);
    setLoaded(true);
  }, [mangaPath]);

  const selectMode = useCallback((next: ReaderMode) => {
    setMode(next);

    if (mangaPath !== undefined) {
      rememberOverrideFor(mangaPath, {
        ...(cachedOverridesPath === mangaPath ? cachedOverrides ?? {} : {}),
        mode: next,
      });
      void saveMangaReaderOverride(mangaPath, 'mode', next);
      return;
    }

    cachedMode = next;
    void saveReaderMode(next);
  }, [mangaPath]);

  const selectScale = useCallback((next: ReaderScale) => {
    setScale(next);

    if (mangaPath !== undefined) {
      rememberOverrideFor(mangaPath, {
        ...(cachedOverridesPath === mangaPath ? cachedOverrides ?? {} : {}),
        scale: next,
      });
      void saveMangaReaderOverride(mangaPath, 'scale', next);
      return;
    }

    cachedScale = next;
    void saveReaderScale(next);
  }, [mangaPath]);

  const selectQuality = useCallback((next: ReaderQuality) => {
    // Image quality is a device-level tradeoff, not a per-title one: picking
    // maximum in one manga applies to every manga.
    cachedQuality = next;
    setQuality(next);
    void saveReaderQuality(next);
  }, []);

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
