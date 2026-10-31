import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { AppState } from 'react-native';

import { markChapterRead, saveProgress } from '../../storage/readerProgress';
import type { ReaderData } from '../../source/zonatmo';

const pageKey = (path: string) => `reader:page:${path}`;
const PROGRESS_WRITE_DELAY = 500;

type PendingProgress = {
  path: string;
  page: number;
  mangaPath?: string;
  chapterTitle: string;
};

type Params = {
  path: string;
  title: string;
  mangaPath?: string;
  data: ReaderData | null;
};

export function useReaderProgress({ path, title, mangaPath, data }: Params) {
  const [page, setPage] = useState(0);
  const [restoredPath, setRestoredPath] = useState<string | null>(null);

  const total = data?.pages.length ?? 0;
  const safePage = total > 0 ? Math.min(page, total - 1) : page;
  // A path change must not expose the previous chapter's page while storage
  // resolves, so restoration is tied to the path that was actually read.
  const restored = restoredPath === path;

  const pendingRef = useRef<PendingProgress | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const pending = pendingRef.current;

    if (!pending) {
      return;
    }

    pendingRef.current = null;
    void AsyncStorage.setItem(pageKey(pending.path), String(pending.page)).catch(
      () => undefined,
    );

    if (pending.mangaPath) {
      void saveProgress(pending.mangaPath, {
        chapterPath: pending.path,
        chapterTitle: pending.chapterTitle,
        page: pending.page,
      });
    }
  }, []);

  useEffect(() => {
    let active = true;

    const restore = async () => {
      let nextPage = 0;

      try {
        const storedPage = await AsyncStorage.getItem(pageKey(path));
        const parsedPage = Number.parseInt(storedPage ?? '', 10);

        if (Number.isFinite(parsedPage) && parsedPage > 0) {
          nextPage = parsedPage;
        }
      } catch {
        // A storage failure must not block reading.
      } finally {
        if (active) {
          setPage(nextPage);
          setRestoredPath(path);
        }
      }
    };

    void restore();

    return () => {
      active = false;
      flush();
    };
  }, [flush, path]);

  // Android can kill a backgrounded app before the debounce timer fires.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        flush();
      }
    });

    return () => subscription.remove();
  }, [flush]);

  useEffect(() => {
    if (!restored || !data) {
      return;
    }

    pendingRef.current = {
      path,
      page: safePage,
      mangaPath,
      chapterTitle: data.title || title,
    };

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(flush, PROGRESS_WRITE_DELAY);

    // Reaching the last page is the honest "chapter finished" signal.
    if (mangaPath && total > 0 && safePage >= total - 1) {
      void markChapterRead(mangaPath, path);
    }
  }, [data, flush, mangaPath, path, restored, safePage, title, total]);

  // Warm the adjacent pages so swipes do not wait on the network.
  useEffect(() => {
    if (!data) {
      return;
    }

    for (const index of [safePage - 1, safePage + 1, safePage + 2]) {
      const pageUrl = data.pages[index];

      if (
        index >= 0 &&
        pageUrl !== undefined &&
        !pageUrl.startsWith('file://')
      ) {
        void Image.prefetch(pageUrl).catch(() => undefined);
      }
    }
  }, [data, safePage]);

  return { page: safePage, setPage, total, restored };
}
