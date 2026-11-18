import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

import { getUpdateState } from './check';
import type { File } from 'expo-file-system';

import {
  downloadApk,
  installApk,
  openInstallPermissionSettings,
  type DownloadProgress,
} from './install';
import { downloadFailureMessage } from './watchdog';

export type UpdatePhase =
  | 'idle'
  | 'confirm'
  | 'permission'
  | 'downloading'
  | 'installing'
  | 'error'
  /** The installer accepted the APK; the sheet shows nothing from here. */
  | 'ready';

export type UpdateFlowState = {
  phase: UpdatePhase;
  progress: DownloadProgress;
  failure: string | null;
  installPermissionGranted: boolean;
  /** True only while the user is away granting the install permission. */
  resumeAfterPermission: boolean;
};

const PERMISSION_KEY = 'update:installPermission';

let state: UpdateFlowState = {
  phase: 'idle',
  progress: { receivedBytes: 0, totalBytes: null },
  failure: null,
  installPermissionGranted: false,
  resumeAfterPermission: false,
};
let initialized = false;
let downloadAbort: AbortController | null = null;
/** APK from the last complete download; survives a failed install. */
let downloadedApk: File | null = null;
const listeners = new Set<() => void>();

function publish(next: UpdateFlowState): void {
  state = next;

  for (const listener of listeners) {
    listener();
  }
}

export function subscribeFlow(listener: () => void): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function getFlowState(): UpdateFlowState {
  return state;
}

/** Loads the stored install-permission grant; call once at app start. */
export async function initFlow(): Promise<void> {
  if (initialized) {
    return;
  }

  initialized = true;
  const raw = await AsyncStorage.getItem(PERMISSION_KEY).catch(() => null);

  publish({ ...state, installPermissionGranted: raw === 'true' });
}

/** Ask for the install permission, then start the download. */
export async function grantPermissionAndDownload(): Promise<void> {
  publish({ ...state, resumeAfterPermission: true });

  try {
    await openInstallPermissionSettings();
    // Returning means the user saw the toggle; a failed install re-arms the
    // ask by resetting the grant.
    await savePermission(true);
    publish({ ...state, installPermissionGranted: true });
    await beginDownload();
  } catch {
    publish({
      ...state,
      phase: 'error',
      failure: 'No se pudo abrir los ajustes de instalación.',
      resumeAfterPermission: false,
    });
  }
}

/** The sheet asked to start: consent first, then permission, then download. */
export function openUpdate(): void {
  if (getUpdateState().available === null) {
    return;
  }

  publish({ ...state, phase: 'confirm', failure: null });
}

/** The confirm sheet was accepted: permission if needed, then download. */
export async function confirmUpdate(): Promise<void> {
  if (!state.installPermissionGranted) {
    publish({ ...state, phase: 'permission' });
    return;
  }

  await beginDownload();
}

/**
 * Retry after a failure. A failed install left the APK on disk, so retrying
 * hands that file back to the installer instead of downloading it again.
 */
export async function retryUpdate(): Promise<void> {
  if (!state.installPermissionGranted) {
    publish({ ...state, phase: 'permission' });
    return;
  }

  if (downloadedApk === null) {
    await beginDownload();
    return;
  }

  await runInstall(downloadedApk);
}

export function closeUpdate(): void {
  if (state.phase === 'downloading') {
    cancelDownload();
    return;
  }

  // Installing cannot be cancelled: the system owns the intent.
  if (state.phase === 'installing') {
    return;
  }

  publish({ ...state, phase: 'idle', failure: null, resumeAfterPermission: false });
}

export async function beginDownload(): Promise<void> {
  if (state.phase === 'downloading') {
    return;
  }

  const release = getUpdateState().available;

  if (release === null) {
    return;
  }

  const controller = new AbortController();
  downloadAbort = controller;
  downloadedApk = null;
  publish({
    ...state,
    phase: 'downloading',
    progress: { receivedBytes: 0, totalBytes: null },
    failure: null,
    resumeAfterPermission: false,
  });

  try {
    const { file, cancelled } = await downloadApk(
      release.apkUrl,
      controller.signal,
      (progress) => publish({ ...state, progress }),
    );

    if (cancelled) {
      publish({ ...state, phase: 'idle', failure: null });
      return;
    }

    downloadedApk = file;
    await runInstall(file);
  } catch (error) {
    publish({ ...state, phase: 'error', failure: failureFor(error) });
    void Haptics.selectionAsync();
  } finally {
    downloadAbort = null;
  }
}

export function cancelDownload(): void {
  downloadAbort?.abort();
  downloadAbort = null;
  downloadedApk = null;
  publish({ ...state, phase: 'idle', failure: null });
}

/** Hands a downloaded APK to the system installer and records the outcome. */
async function runInstall(file: File): Promise<void> {
  publish({ ...state, phase: 'installing' });
  let outcome: 'installed' | 'cancelled';

  try {
    outcome = await installApk(file);
  } catch {
    // The intent failed, most often because the install permission is
    // missing or was revoked: force the permission screen again next
    // time instead of failing silently forever.
    await savePermission(false);
    publish({
      ...state,
      installPermissionGranted: false,
      phase: 'error',
      failure: 'No se pudo abrir el instalador. Revisá el permiso de instalación.',
    });
    void Haptics.selectionAsync();
    return;
  }

  if (outcome === 'cancelled') {
    // Dismissing the installer is the user's call, not an error.
    publish({ ...state, phase: 'idle', failure: null });
    return;
  }

  await savePermission(true);
  publish({ ...state, phase: 'ready', failure: null });
  void Haptics.selectionAsync();
}

/** The AppState listener fired and armed the resume; run the download now. */
export function clearResumeAfterPermission(): void {
  publish({ ...state, resumeAfterPermission: false });
}

async function savePermission(granted: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(PERMISSION_KEY, String(granted));
  } catch {
    // Losing the flag only costs one extra permission screen.
  }
}

function failureFor(error: unknown): string {
  if (
    error instanceof Error &&
    (error.message === 'stalled' || error.message === 'timeout')
  ) {
    return downloadFailureMessage(error.message);
  }

  return 'No se pudo completar la actualización.';
}
