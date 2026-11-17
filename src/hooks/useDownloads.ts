import { useSyncExternalStore } from 'react';

import { getDownloadState, subscribe } from '../downloads/manager';
import type { DownloadState } from '../downloads/types';

export function useIsChapterDownloaded(chapterPath: string): boolean {
  return useSyncExternalStore(
    subscribe,
    () => getDownloadState(chapterPath)?.status === 'done',
    () => false,
  );
}

/**
 * State of one chapter, subscribed per path: a download tick only re-renders
 * the button of the chapter ticking, never the list that hosts it.
 */
export function useDownloadState(chapterPath: string): DownloadState | undefined {
  return useSyncExternalStore(
    subscribe,
    () => getDownloadState(chapterPath),
    () => undefined,
  );
}
