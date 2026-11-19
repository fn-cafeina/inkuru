import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { isInLibrary } from '@/storage/library';
import { loadProgress, loadReadChapters } from '@/storage/readerProgress';
import type { ReaderProgress } from '@/storage/readerProgress';

export type MangaLocalState = {
  progress: ReaderProgress | null;
  readChapters: string[];
  inLibrary: boolean;
};

// Keep the last local state per manga so reopening a title does not flash the
// wrong CTA while AsyncStorage resolves.
const LOCAL_CACHE_LIMIT = 20;
const localCache = new Map<string, MangaLocalState>();

/**
 * The parts of a manga that live on the device: where reading stopped, which
 * chapters are read, and whether it is in the library. Reloaded on every focus,
 * so coming back from the reader shows the marks it just wrote.
 */
export function useMangaLocal(path: string) {
  const cached = localCache.get(path);
  const [progress, setProgress] = useState<ReaderProgress | null>(
    () => cached?.progress ?? null,
  );
  const [readChapters, setReadChapters] = useState<string[]>(
    () => cached?.readChapters ?? [],
  );
  const [inLibrary, setInLibrary] = useState(() => cached?.inLibrary ?? false);
  const [localLoaded, setLocalLoaded] = useState(() => cached !== undefined);
  // Bumped once the reload lands, so the read bars re-read their page marks.
  const [focusTick, setFocusTick] = useState(0);
  const remember = useCallback(
    (state: MangaLocalState) => rememberLocal(path, state),
    [path],
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;

      void Promise.all([
        loadProgress(path),
        loadReadChapters(path),
        isInLibrary(path),
      ]).then(([value, reads, saved]) => {
        if (!active) {
          return;
        }

        rememberLocal(path, {
          progress: value,
          readChapters: reads,
          inLibrary: saved,
        });
        setProgress(value);
        // The focus reload usually returns the list already on screen; a new
        // array identity would re-render every chapter row for nothing.
        setReadChapters((current) =>
          current.length === reads.length &&
          reads.every((chapter) => current.includes(chapter))
            ? current
            : reads,
        );
        setInLibrary(saved);
        setLocalLoaded(true);
        setFocusTick((tick) => tick + 1);
      });

      return () => {
        active = false;
      };
    }, [path]),
  );

  return {
    progress,
    readChapters,
    inLibrary,
    localLoaded,
    focusTick,
    setInLibrary,
    remember,
  };
}

export function rememberLocal(path: string, state: MangaLocalState) {
  localCache.delete(path);
  localCache.set(path, state);

  if (localCache.size > LOCAL_CACHE_LIMIT) {
    const oldest = localCache.keys().next().value;

    if (oldest !== undefined) {
      localCache.delete(oldest);
    }
  }
}
