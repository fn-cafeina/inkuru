/**
 * Kills downloads that cannot finish: a hard timeout plus a stall timeout
 * that resets on every progress tick. Plain timers, no expo imports, so the
 * behavior is checkable in bun.
 */

export type StallReason = 'user' | 'stalled' | 'timeout';

export type DownloadWatchdog = {
  /** Pass to the download task; aborts on stall, timeout or user cancel. */
  signal: AbortSignal;
  /** The first reason that aborted, null while the download is healthy. */
  reason: () => StallReason | null;
  /** Call on every progress tick to reset the stall timer. */
  progress: () => void;
  /** The caller's own cancellation; wins over any later watchdog. */
  cancel: () => void;
  /** Stop the timers once the download settles. */
  done: () => void;
};

/** The GitHub-hosted APK can take a long time on a bad connection. */
export const DOWNLOAD_TIMEOUT_MS = 10 * 60 * 1000;
/** A healthy download reports progress far more often than this. */
export const PROGRESS_STALL_MS = 45 * 1000;

export function createDownloadWatchdog(
  timeouts: { timeoutMs: number; stallMs: number } = {
    timeoutMs: DOWNLOAD_TIMEOUT_MS,
    stallMs: PROGRESS_STALL_MS,
  },
): DownloadWatchdog {
  const controller = new AbortController();
  let reason: StallReason | null = null;
  let stallTimer: ReturnType<typeof setTimeout> | undefined;

  function abort(next: StallReason): void {
    if (reason === null) {
      reason = next;
      controller.abort();
    }
  }

  function armStall(): void {
    clearTimeout(stallTimer);
    stallTimer = setTimeout(() => abort('stalled'), timeouts.stallMs);
  }

  const timeoutTimer = setTimeout(() => abort('timeout'), timeouts.timeoutMs);
  armStall();

  return {
    signal: controller.signal,
    reason: () => reason,
    progress: armStall,
    cancel: () => abort('user'),
    done: () => {
      clearTimeout(timeoutTimer);
      clearTimeout(stallTimer);
    },
  };
}

/** Plain Spanish per watchdog outcome; null is an ordinary download error. */
export function downloadFailureMessage(reason: StallReason | null): string {
  if (reason === 'stalled') {
    return 'La descarga se detuvo por conexión lenta. Reintentá cuando tengas mejor señal.';
  }

  if (reason === 'timeout') {
    return 'La descarga tardó demasiado. Reintentá con mejor conexión.';
  }

  return 'No se pudo completar la actualización.';
}
