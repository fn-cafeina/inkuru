import { useEffect } from 'react';
import { BackHandler } from 'react-native';

import { readerConsumesBack } from './readerBack';

type Options = {
  settingsOpen: boolean;
  pickerOpen: boolean;
  chromeVisible: boolean;
  /** Both the chapter and the saved preferences are resolved. */
  ready: boolean;
  setSettingsOpen: (open: boolean) => void;
  setPickerOpen: (open: boolean) => void;
  setChromeVisible: (visible: boolean) => void;
};

/**
 * Hardware back inside the reader: close a sheet, then hide the chrome, then
 * let the press fall through to the stack.
 */
export function useReaderBack({
  settingsOpen,
  pickerOpen,
  chromeVisible,
  ready,
  setSettingsOpen,
  setPickerOpen,
  setChromeVisible,
}: Options) {
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (settingsOpen) {
          setSettingsOpen(false);
          return true;
        }

        if (pickerOpen) {
          setPickerOpen(false);
          return true;
        }

        // While the first chapter loads there is no chrome to hide, so the
        // press must fall through instead of being swallowed.
        if (!readerConsumesBack({ sheetOpen: false, chromeVisible, ready })) {
          return false;
        }

        setChromeVisible(false);
        return true;
      },
    );

    return () => subscription.remove();
  }, [
    chromeVisible,
    pickerOpen,
    ready,
    setChromeVisible,
    setPickerOpen,
    setSettingsOpen,
    settingsOpen,
  ]);
}
