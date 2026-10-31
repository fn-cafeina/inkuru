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
    loaded,
    selectMode,
    selectScale,
    selectQuality,
  };
}
