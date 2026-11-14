import Constants from 'expo-constants';
import { File, Paths } from 'expo-file-system';
import {
  ActivityAction,
  ResultCode,
  startActivityAsync,
} from 'expo-intent-launcher';

import { createDownloadWatchdog } from './watchdog';

const APK_NAME = 'update.apk';
const APK_MIME = 'application/vnd.android.package-archive';
// Intent.FLAG_GRANT_READ_URI_PERMISSION: the system installer needs read
// access to the content URI, and the FileProvider grants nothing without it.
const FLAG_GRANT_READ_URI_PERMISSION = 0x00000001;

export interface DownloadResult {
  file: File;
  /** True when the user cancelled; a partial APK is left on disk. */
  cancelled: boolean;
}

export type DownloadProgress = {
  receivedBytes: number;
  totalBytes: number | null;
};

/**
 * Downloads with the watchdog on top of the caller's signal: the platform
 * task owns progress and cancellation, the watchdog adds the stalls.
 */
export async function downloadApk(
  url: string,
  signal: AbortSignal,
  onProgress: (progress: DownloadProgress) => void,
): Promise<DownloadResult> {
  const target = new File(Paths.cache, APK_NAME);

  if (target.exists) {
    target.delete();
  }

  const watchdog = createDownloadWatchdog();
  const onExternalAbort = () => watchdog.cancel();

  if (signal.aborted) {
    watchdog.cancel();
  } else {
    signal.addEventListener('abort', onExternalAbort, { once: true });
  }

  try {
    const file = await File.downloadFileAsync(url, target, {
      idempotent: true,
      signal: watchdog.signal,
      onProgress: ({ bytesWritten, totalBytes }) => {
        watchdog.progress();
        onProgress({
          receivedBytes: bytesWritten,
          totalBytes: totalBytes > 0 ? totalBytes : null,
        });
      },
    });

    return { file, cancelled: false };
  } catch (error) {
    const reason = watchdog.reason();

    if (reason === 'user') {
      return { file: target, cancelled: true };
    }

    if (reason !== null) {
      throw new Error(reason);
    }

    throw error;
  } finally {
    watchdog.done();
    signal.removeEventListener('abort', onExternalAbort);
  }
}

/** A cancelled download leaves a partial APK; it would confuse the installer. */
export function removeApk(): void {
  try {
    const target = new File(Paths.cache, APK_NAME);

    if (target.exists) {
      target.delete();
    }
  } catch {
    // The next download overwrites it (idempotent).
  }
}

/** Deletes an APK left over from a previous session, when the app starts. */
export function cleanupOldApk(): void {
  removeApk();
}

/**
 * Opens the system screen where the user grants "install unknown apps".
 * Used before downloading so the consent never interrupts mid-update.
 */
export async function openInstallPermissionSettings(): Promise<void> {
  const packageName = Constants.expoConfig?.android?.package;

  if (packageName === undefined) {
    throw new Error('android package not configured');
  }

  await startActivityAsync(ActivityAction.MANAGE_UNKNOWN_APP_SOURCES, {
    data: `package:${packageName}`,
  });
}

/**
 * Hands the APK to the system installer. `installed` means the installer
 * accepted the APK, not that the install finished; a dismissal is the user's
 * call, not a failure, so it reports `cancelled` instead of throwing.
 */
export async function installApk(apk: File): Promise<'installed' | 'cancelled'> {
  const result = await startActivityAsync('android.intent.action.INSTALL_PACKAGE', {
    data: apk.contentUri,
    type: APK_MIME,
    flags: FLAG_GRANT_READ_URI_PERMISSION,
  });

  return result.resultCode === ResultCode.Success ? 'installed' : 'cancelled';
}
