import { Image } from 'expo-image';

import { getDownloadState } from '@/downloads/manager';
import { withTimeout } from '@/downloads/timeout';
import { isReaderData } from '@/source/guards';
import { fetchReader } from '@/source/zonatmo';
import { REQUEST_TIMEOUT_MS } from '@/source/http';
import { readerCacheKey } from '@/storage/cacheKeys';
import { writeCache } from '@/storage/queryCache';
import { writeRemoteCache } from '@/storage/remoteCache';

/** Pages warmed up front; the reader prefetches the rest as you scroll. */
const WARM_PAGES = 2;
// Chapters are long; this only stops a re-fetch when the reader bounces around
// the same transition. One attempt per chapter per session, failures included.
const LIMIT = 24;
const warmed = new Set<string>();

function remember(chapterPath: string) {
  warmed.add(chapterPath);

  if (warmed.size > LIMIT) {
    const oldest = warmed.keys().next().value;

    if (oldest !== undefined) {
      warmed.delete(oldest);
    }
  }
}

/**
 * Fetches the chapter the user is about to open and drops it in both caches,
 * so tapping next paints from memory instead of paying the round trip. Called
 * only when the reader is near the end of the current chapter.
 */
export async function prefetchChapter(chapterPath: string): Promise<void> {
  if (warmed.has(chapterPath)) {
    return;
  }

  remember(chapterPath);

  // A downloaded chapter already opens from its own files.
  if (getDownloadState(chapterPath)?.status === 'done') {
    return;
  }

  const key = readerCacheKey(chapterPath);
  const controller = new AbortController();

  try {
    const data = await withTimeout(controller, REQUEST_TIMEOUT_MS, () =>
      fetchReader(chapterPath, controller.signal),
    );

    if (!isReaderData(data)) {
      return;
    }

    writeRemoteCache(key, data, Date.now());
    writeCache(key, data);

    for (const page of data.pages.slice(0, WARM_PAGES)) {
      if (!page.startsWith('file://')) {
        void Image.prefetch(page).catch(() => undefined);
      }
    }
  } catch {
    // The next chapter failing early is not something to show; opening it
    // retries on its own.
  }
}
