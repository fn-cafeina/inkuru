import { useCallback, useState } from 'react';

import {
  DEFAULT_READER_MODE,
  DEFAULT_READER_QUALITY,
  DEFAULT_READER_SCALE,
  loadKeepAwake,
  loadReaderMode,
  loadReaderQuality,
  loadReaderScale,
  saveKeepAwake,
  saveReaderMode,
  saveReaderQuality,
  saveReaderScale,
} from '../storage/readerSettings';
import type {
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

/**
 * Shared load/select state for the four reader preferences. The keep-awake
 * activation itself stays in useReaderPreferences, where the reader owns it.
 */
export function useReaderSettings() {
  const [mode, setMode] = useState<ReaderMode>(cachedMode);
  const [scale, setScale] = useState<ReaderScale>(cachedScale);
  const [quality, setQuality] = useState<ReaderQuality>(cachedQuality);
  const [keepAwake, setKeepAwake] = useState(cachedKeepAwake);
  const [loaded, setLoaded] = useState(false);

  const restore = useCallback(async (isActive: () => boolean = () => true) => {
    const [storedMode, storedScale, storedQuality, storedKeepAwake] =
      await Promise.all([
        loadReaderMode(),
        loadReaderScale(),
        loadReaderQuality(),
        loadKeepAwake(),
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
    setLoaded(true);
  }, []);

  const selectMode = useCallback((next: ReaderMode) => {
    cachedMode = next;
    setMode(next);
    void saveReaderMode(next);
  }, []);

  const selectScale = useCallback((next: ReaderScale) => {
    cachedScale = next;
    setScale(next);
    void saveReaderScale(next);
  }, []);

  const selectQuality = useCallback((next: ReaderQuality) => {
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
