import { useEffect, useMemo, useState } from 'react';

import { chapterRatios } from '@/screens/manga/chapters';
import type { MangaChapter } from '@/source/zonatmo';
import { loadPageMarks } from '@/storage/readerProgress';
import type { PageMark } from '@/storage/readerProgress';

/**
 * Share of each chapter read, keyed by chapter path, for the bars under the
 * chapter rows. Page marks load once per chapter list: a chapter that was
 * never opened has no length, so it gets no bar.
 */
export function useChapterRatios(
  chapters: MangaChapter[],
  readChapters: string[],
): Record<string, number> {
  const [marks, setMarks] = useState<Record<string, PageMark>>({});

  useEffect(() => {
    let active = true;

    if (chapters.length === 0) {
      return;
    }

    void loadPageMarks(chapters.map((chapter) => chapter.path)).then(
      (loaded) => {
        if (active) {
          setMarks(loaded);
        }
      },
    );

    return () => {
      active = false;
    };
  }, [chapters]);

  return useMemo(
    () => chapterRatios(chapters, new Set(readChapters), marks),
    [chapters, readChapters, marks],
  );
}
