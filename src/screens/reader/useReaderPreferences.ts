import { useEffect, useState } from 'react';
import {
  activateKeepAwakeAsync,
  deactivateKeepAwake,
} from 'expo-keep-awake';

import {
  DEFAULT_READER_MODE,
  DEFAULT_READER_QUALITY,
  DEFAULT_READER_SCALE,
  loadKeepAwake,
  loadReaderMode,
  loadReaderQuality,
  loadReaderScale,
  saveReaderMode,
  saveReaderQuality,
  saveReaderScale,
} from '../../storage/readerSettings';
import type {
  ReaderMode,
  ReaderQuality,
  ReaderScale,
} from '../../storage/readerSettings';

// Keep the last reading preferences for the next mount (chapter switch) while
// AsyncStorage resolves.
let preferredMode: ReaderMode = DEFAULT_READER_MODE;
let preferredScale: ReaderScale = DEFAULT_READER_SCALE;
let preferredQuality: ReaderQuality = DEFAULT_READER_QUALITY;

export function useReaderPreferences() {
  const [mode, setMode] = useState<ReaderMode>(preferredMode);
  const [scale, setScale] = useState<ReaderScale>(preferredScale);
  const [quality, setQuality] = useState<ReaderQuality>(preferredQuality);
  const [keepAwake, setKeepAwake] = useState(true);

  useEffect(() => {
    let active = true;

    const restore = async () => {
      try {
        const [storedMode, storedScale, storedQuality, storedKeepAwake] =
          await Promise.all([
            loadReaderMode(),
            loadReaderScale(),
            loadReaderQuality(),
            loadKeepAwake(),
          ]);

        if (!active) {
          return;
        }

        if (storedMode) {
          preferredMode = storedMode;
          setMode(storedMode);
        }

        if (storedScale) {
          preferredScale = storedScale;
          setScale(storedScale);
        }

        if (storedQuality) {
          preferredQuality = storedQuality;
          setQuality(storedQuality);
        }

        setKeepAwake(storedKeepAwake);
      } catch {
        // A storage failure must not block reading.
      }
    };

    void restore();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!keepAwake) {
      return;
    }

    void activateKeepAwakeAsync('reader');

    return () => {
      void deactivateKeepAwake('reader');
    };
  }, [keepAwake]);

  const selectMode = (next: ReaderMode) => {
    preferredMode = next;
    setMode(next);
    void saveReaderMode(next);
  };
  const selectScale = (next: ReaderScale) => {
    preferredScale = next;
    setScale(next);
    void saveReaderScale(next);
  };
  const selectQuality = (next: ReaderQuality) => {
    preferredQuality = next;
    setQuality(next);
    void saveReaderQuality(next);
  };

  return {
    mode,
    scale,
    quality,
    selectMode,
    selectScale,
    selectQuality,
  };
}
