import { useEffect } from 'react';
import {
  activateKeepAwakeAsync,
  deactivateKeepAwake,
} from 'expo-keep-awake';

import { useReaderSettings } from '../../hooks/useReaderSettings';

export function useReaderPreferences() {
  const {
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
  } = useReaderSettings();

  useEffect(() => {
    let active = true;

    void restore(() => active);

    return () => {
      active = false;
    };
  }, [restore]);

  useEffect(() => {
    if (!keepAwake || !loaded) {
      return;
    }

    void activateKeepAwakeAsync('reader');

    return () => {
      void deactivateKeepAwake('reader');
    };
  }, [keepAwake, loaded]);

  return {
    mode,
    scale,
    quality,
    keepAwake,
    loaded,
    selectMode,
    selectScale,
    selectQuality,
    selectKeepAwake,
  };
}
