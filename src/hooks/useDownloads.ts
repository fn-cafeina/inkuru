import { useEffect, useSyncExternalStore } from 'react';

import {
  getVersion,
  initializeDownloads,
  subscribe,
} from '../downloads/manager';

export function useDownloadVersion(): number {
  useEffect(() => {
    void initializeDownloads();
  }, []);

  return useSyncExternalStore(subscribe, getVersion, getVersion);
}
