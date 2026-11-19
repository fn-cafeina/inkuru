import * as Haptics from 'expo-haptics';

import { log } from './log';

let warned = false;

/**
 * A tap-selection buzz, best effort. Some clients have no native haptics
 * module at all (an Expo Go build older than the SDK, an emulator without a
 * vibrator), and the call rejects. Without this the rejection floats and React
 * Native paints a red box over the screen for a buzz nobody needed.
 */
export function selectHaptic(): void {
  Haptics.selectionAsync().catch((error: unknown) => {
    if (warned) {
      return;
    }

    warned = true;
    log.warn('haptics', 'no selection feedback', {
      reason: error instanceof Error ? error.message : String(error),
    });
  });
}
