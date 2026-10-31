import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';

import { markChapterRead, saveProgress } from '../../storage/readerProgress';
import type { ReaderData } from '../../source/zonatmo';

const pageKey = (path: string) => `reader:page:${path}`;

type Params = {
  path: string;
  title: string;
  mangaPath?: string;
  data: ReaderData | null;
};

export function useReaderProgress({ path, title, mangaPath, data }: Params) {
  const [page, setPage] = useState(0);
  const [restoredPath, setRestoredPath] = useState<string | null>(null);

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
    };
  }, [path]);

  const total = data?.pages.length ?? 0;
  const safePage = total > 0 ? Math.min(page, total - 1) : page;
  // A path change must not expose the previous chapter's page while storage
  // resolves, so restoration is tied to the path that was actually read.
  const restored = restoredPath === path;

  useEffect(() => {
    if (!restored || !data) {
      return;
    }

    void AsyncStorage.setItem(pageKey(path), String(safePage));

    if (mangaPath) {
      void saveProgress(mangaPath, {
        chapterPath: path,
        chapterTitle: data?.title || title,
        page: safePage,
      });

      // Reaching the last page is the honest "chapter finished" signal.
      if (total > 0 && safePage >= total - 1) {
        void markChapterRead(mangaPath, path);
      }
    }
  }, [data, mangaPath, path, restored, safePage, title, total]);

  // Warm the adjacent pages so swipes do not wait on the network.
  useEffect(() => {
    if (!data) {
      return;
    }

    for (const index of [safePage - 1, safePage + 1, safePage + 2]) {
      const pageUrl = data.pages[index];

      if (index >= 0 && pageUrl !== undefined) {
        void Image.prefetch(pageUrl);
      }
    }
  }, [data, safePage]);

  return { page: safePage, setPage, total, restored };
}
