import { useEffect, useSyncExternalStore } from 'react';

import {
  getDownloadState,
  getVersion,
  initializeDownloads,
  subscribe,
} from '../downloads/manager';

function useDownloadsReady() {
  useEffect(() => {
    void initializeDownloads();
  }, []);
}

export function useDownloadVersion(): number {
  useDownloadsReady();

  return useSyncExternalStore(subscribe, getVersion, getVersion);
}

export function useIsChapterDownloaded(chapterPath: string): boolean {
  useDownloadsReady();

  return useSyncExternalStore(
    subscribe,
    () => getDownloadState(chapterPath)?.status === 'done',
    () => false,
  );
}
