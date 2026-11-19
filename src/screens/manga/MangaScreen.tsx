import { useCallback, useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorState } from '@/components/ErrorState';
import { Screen } from '@/components/Screen';
import { MangaChapterList } from './components/MangaChapterList';
import { MangaSkeleton } from './components/MangaSkeleton';
import { MangaTopBar } from './components/MangaTopBar';
import { useRemoteData } from '@/hooks/useRemoteData';
import { useOpenLog } from '@/hooks/useOpenLog';
import { useChapterRatios } from '@/hooks/useChapterRatios';
import { useMangaLocal } from './useMangaLocal';
import { useMangaSnapshot } from '@/hooks/useMangaSnapshot';
import { hasDownloadsFor } from '@/downloads/metadata';
import type { Fields } from '@/dev/log';
import { addToLibrary, removeFromLibrary } from '@/storage/library';
import { forgetMangaSnapshot } from '@/storage/mangaSnapshot';
import type { ReaderProgress } from '@/storage/readerProgress';
import { isMangaDetail } from '@/source/guards';
import { toPath } from '@/source/url';
import { fetchManga } from '@/source/zonatmo';
import type { MangaChapter, MangaDetail } from '@/source/zonatmo';
import { CACHE_FRESH_MS } from '@/storage/queryCache';
import { goBackOrTabs } from '@/navigation/back';
import {
  ascendingChapters,
  chunkChapters,
  displayChapters,
  nextToRead,
  rangeIndexForChapter,
} from './chapters';
import type {
  ChapterRange,
  ChapterSort,
} from './chapters';

// Last range/sort picked per manga so reopening a title lands where the user
// left off instead of back on the first range. Range stays null until picked,
// so it keeps following the chapter in progress.
// shortcut: no eviction; entries are two scalars, add an LRU like localCache if
// the map ever grows past a handful of titles.
type MangaViewState = { range: number | null; sort: ChapterSort };
const viewCache = new Map<string, MangaViewState>();

function rememberView(path: string, state: MangaViewState) {
  viewCache.delete(path);
  viewCache.set(path, state);
}

function resolveRangeIndex(
  ranges: ChapterRange[],
  active: number | null,
  progress: ReaderProgress | null,
): number {
  // No manual pick yet: open on the range holding the chapter in progress.
  const chosen = active ?? rangeIndexForChapter(ranges, progress?.chapterPath);

  return Math.min(chosen, Math.max(ranges.length - 1, 0));
}

/** Sizes for the open line, or null while there is nothing to show yet. */
function mangaOpenFields(data: MangaDetail | null): Fields | null {
  if (data === null) {
    return null;
  }

  return {
    chapters: data.chapters.length,
    related: data.related.length,
  };
}

export default function MangaScreen() {
  // A deep link can carry any string here, so everything below works on a site
  // path: an absolute URL would make the app fetch whatever host it names.
  const params = useLocalSearchParams<{ path: string }>();
  const path = toPath(params.path ?? '');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const fetcher = useCallback(
    (signal: AbortSignal) => fetchManga(path, signal),
    [path],
  );
  const { data, hasError, loading, reload, refreshing, refresh } =
    useRemoteData(fetcher, `manga:${path}`, {
      freshMs: CACHE_FRESH_MS.manga,
      validate: isMangaDetail,
    });
  const {
    progress,
    readChapters,
    inLibrary,
    localLoaded,
    focusTick,
    setInLibrary,
    remember,
  } = useMangaLocal(path);
  const [sortOrder, setSortOrder] = useState<ChapterSort>(
    () => viewCache.get(path)?.sort ?? 'asc',
  );
  const [activeRange, setActiveRange] = useState<number | null>(
    () => viewCache.get(path)?.range ?? null,
  );

  // Chapter lengths are only known for chapters opened at least once, so the
  // bars land after the list does.
  const ratios = useChapterRatios(
    data?.chapters ?? [],
    readChapters,
    focusTick,
  );

  // Whatever is worth reading offline keeps its detail past the query cache,
  // and it steps in when the network is down and the cache no longer has the
  // manga.
  const snapshot = useMangaSnapshot(path, data, inLibrary);
  const manga = data ?? snapshot;

  const toggleLibrary = async () => {
    if (!data && !inLibrary) {
      return;
    }

    const ok = inLibrary
      ? await removeFromLibrary(path)
      : data
        ? await addToLibrary({
            path,
            title: data.title,
            cover: data.cover,
            addedAt: Date.now(),
          })
        : false;

    if (!ok) {
      Alert.alert(
        'No se pudo actualizar la biblioteca',
        'Inténtalo de nuevo.',
      );
      return;
    }

    setInLibrary(!inLibrary);
    remember({ progress, readChapters, inLibrary: !inLibrary });

    // Out of the library with nothing downloaded: no reason to keep the detail
    // around. A download keeps its chapter list reachable offline.
    if (inLibrary && !(await hasDownloadsFor(path))) {
      void forgetMangaSnapshot(path);
    }
  };

  // Ranges always read oldest to newest; sorting only flips chapters inside a
  // range. The source lists chapters newest first.
  const ascending = useMemo(
    () => ascendingChapters(manga?.chapters ?? []),
    [manga],
  );
  const readSet = useMemo(() => new Set(readChapters), [readChapters]);
  // The saved chapter stops being the continue target once it is read: the
  // highlight and the continue button move on to the next unread chapter.
  const continueChapter = useMemo(
    () => nextToRead(ascending, progress?.chapterPath, readSet),
    [ascending, progress, readSet],
  );
  const ranges = useMemo(() => chunkChapters(ascending), [ascending]);
  const rangeIndex = resolveRangeIndex(ranges, activeRange, progress);
  const activeChapters = useMemo(
    () => ranges[rangeIndex]?.chapters ?? [],
    [rangeIndex, ranges],
  );
  // Stable identity keeps the memoized chapter cards from re-rendering when
  // only the screen's own state changed.
  const visibleChapters = useMemo(
    () => displayChapters(activeChapters, sortOrder),
    [activeChapters, sortOrder],
  );

  const toggleSort = useCallback(() => {
    const next = sortOrder === 'desc' ? 'asc' : 'desc';

    rememberView(path, { range: activeRange, sort: next });
    setSortOrder(next);
  }, [activeRange, path, sortOrder]);

  const selectRange = useCallback(
    (index: number) => {
      rememberView(path, { range: index, sort: sortOrder });
      setActiveRange(index);
    },
    [path, sortOrder],
  );
  const goBack = () => {
    goBackOrTabs(router);
  };
  const openMangaRelated = useCallback(
    (relatedPath: string, title: string) =>
      // Replace, not push: hopping through related titles must not grow the
      // stack, so back always lands on the tabs, like rokimu.
      router.replace({ pathname: '/manga', params: { path: relatedPath, title } }),
    [router],
  );
  const openChapter = useCallback(
    (chapter: MangaChapter) =>
      router.push({
        pathname: '/reader',
        params: {
          path: chapter.path,
          title: chapter.title,
          mangaPath: path,
        },
      }),
    [router, path],
  );

  // One line per open: how long the screen took to have something to show,
  // with the sizes that explain it.
  useOpenLog('manga', path, mangaOpenFields(data));

  // The top row lives inside the scroll content, like rokimu's banner: no
  // overlay to pin, cover or hide.
  const topBar = (
    <MangaTopBar
      onBack={goBack}
      canToggleLibrary={Boolean(data) || inLibrary}
      inLibrary={inLibrary}
      onToggleLibrary={() => {
        void toggleLibrary();
      }}
    />
  );

  return (
    <Screen>
      {loading && !manga ? (
        <MangaSkeleton topBar={topBar} />
      ) : hasError && !manga ? (
        <View className="flex-1">
          {topBar}
          <ErrorState message="No se pudo cargar el manga" onRetry={reload} />
        </View>
      ) : manga ? (
        <MangaChapterList
          topBar={topBar}
          manga={manga}
          mangaPath={path}
          chapters={visibleChapters}
          ranges={ranges}
          rangeIndex={rangeIndex}
          sortOrder={sortOrder}
          readChapters={readChapters}
          ratios={ratios}
          currentChapterPath={continueChapter?.path}
          resumeChapter={continueChapter}
          bottomInset={insets.bottom}
          refreshing={refreshing}
          ready={localLoaded}
          onRefresh={refresh}
          onSelectRange={selectRange}
          onToggleSort={toggleSort}
          onOpen={openChapter}
          onOpenRelated={openMangaRelated}
        />
      ) : (
        <View className="flex-1">
          {topBar}
          <ErrorState message="Manga no disponible" onRetry={reload} />
        </View>
      )}
    </Screen>
  );
}

