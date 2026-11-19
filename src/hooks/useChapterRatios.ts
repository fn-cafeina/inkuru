import { useEffect, useMemo, useState } from 'react';

import { chapterRatios } from '@/screens/manga/chapters';
import type { MangaChapter } from '@/source/zonatmo';
import { loadPageMarks } from '@/storage/readerProgress';
import type { PageMark } from '@/storage/readerProgress';

/**
 * Share of each chapter read, keyed by chapter path, for the bars under the
 * chapter rows. A chapter that was never opened has no length, so it gets no
 * bar. `refreshKey` re-reads the marks when the screen comes back into view:
 * a chapter read a minute ago changed its mark, not the chapter list.
 */
export function useChapterRatios(
  chapters: MangaChapter[],
  readChapters: string[],
  refreshKey = 0,
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
  }, [chapters, refreshKey]);

  return useMemo(
    () => chapterRatios(chapters, new Set(readChapters), marks),
    [chapters, readChapters, marks],
  );
}
