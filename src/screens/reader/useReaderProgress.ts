import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';

import { markChapterRead, saveProgress } from '../../storage/readerProgress';
import type { ReaderData } from '../../source/leercapitulo';

const pageKey = (path: string) => `reader:page:${path}`;

type Params = {
  path: string;
  title: string;
  mangaPath?: string;
  data: ReaderData | null;
};

export function useReaderProgress({ path, title, mangaPath, data }: Params) {
  const [page, setPage] = useState(0);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    let active = true;

    const restore = async () => {
      try {
        const storedPage = await AsyncStorage.getItem(pageKey(path));
        const parsedPage = Number.parseInt(storedPage ?? '', 10);

        if (active && Number.isFinite(parsedPage) && parsedPage > 0) {
          setPage(parsedPage);
        }
      } catch {
        // A storage failure must not block reading.
      } finally {
        if (active) {
          setRestored(true);
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

  useEffect(() => {
    if (!restored) {
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
  }, [data?.title, mangaPath, path, restored, safePage, title, total]);

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

  return { page: safePage, setPage, total };
}
