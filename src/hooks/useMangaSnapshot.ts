import { useEffect, useRef, useState } from 'react';

import { hasDownloadsFor } from '@/downloads/metadata';
import { log } from '@/dev/log';
import {
  loadMangaSnapshot,
  saveMangaSnapshot,
} from '@/storage/mangaSnapshot';
import type { MangaDetail } from '@/source/zonatmo';

/**
 * The manga detail as saved on the device, kept in sync with what is worth
 * reading offline: a library manga, or a manga with downloaded chapters. The
 * saved copy is read before the network answers, so an open with no connection
 * shows the chapter list instead of a skeleton and a timeout.
 */
export function useMangaSnapshot(
  mangaPath: string,
  detail: MangaDetail | null,
  inLibrary: boolean,
): MangaDetail | null {
  const [snapshot, setSnapshot] = useState<MangaDetail | null>(null);
  // What the last write stored. The detail gets a new identity on every
  // revalidation, cache hits included, so identity alone would rewrite tens of
  // kilobytes of JSON per open.
  const savedRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;

    void loadMangaSnapshot(mangaPath).then((saved) => {
      if (!active) {
        return;
      }

      // Clearing matters as much as loading: the next manga on this screen may
      // have no copy, and the previous one would stay under its route.
      setSnapshot(saved);

      if (saved) {
        log.debug('manga', mangaPath, {
          source: 'snapshot',
          chapters: saved.chapters.length,
        });
      }
    });

    return () => {
      active = false;
    };
  }, [mangaPath]);

  useEffect(() => {
    if (!detail) {
      return;
    }

    let active = true;
    const signature = `${detail.title}|${detail.cover}|${detail.chapters.length}`;

    if (savedRef.current === signature) {
      return;
    }

    void hasDownloadsFor(mangaPath).then((downloaded) => {
      if (active && (inLibrary || downloaded)) {
        savedRef.current = signature;
        void saveMangaSnapshot(mangaPath, detail);
      }
    });

    return () => {
      active = false;
    };
  }, [detail, inLibrary, mangaPath]);

  return snapshot;
}
