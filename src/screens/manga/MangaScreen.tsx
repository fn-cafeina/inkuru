import { useCallback, useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorState } from '../../components/ErrorState';
import { Screen } from '../../components/Screen';
import { MangaChapterList } from './components/MangaChapterList';
import { MangaSkeleton } from './components/MangaSkeleton';
import { MangaTopBar } from './components/MangaTopBar';
import { useRemoteData } from '../../hooks/useRemoteData';
import { useOpenLog } from '../../hooks/useOpenLog';
import type { Fields } from '../../dev/log';
import { addToLibrary, isInLibrary, removeFromLibrary } from '../../storage/library';
import { loadProgress, loadReadChapters } from '../../storage/readerProgress';
import type { ReaderProgress } from '../../storage/readerProgress';
import { isMangaDetail } from '../../source/guards';
import { fetchManga } from '../../source/zonatmo';
import type { MangaChapter, MangaDetail } from '../../source/zonatmo';
import { CACHE_FRESH_MS } from '../../storage/queryCache';
import type { RootStackParamList } from '../../navigation/types';
import { goBackOrTabs } from '../../navigation/back';
import {
  ascendingChapters,
  chunkChapters,
  displayChapters,
  rangeIndexForChapter,
} from './chapters';
import type {
  ChapterRange,
  ChapterSort,
} from './chapters';

type Props = NativeStackScreenProps<RootStackParamList, 'Manga'>;

type MangaLocalState = {
  progress: ReaderProgress | null;
  readChapters: string[];
  inLibrary: boolean;
};

// Keep the last local state per manga so reopening a title does not flash the
// wrong CTA while AsyncStorage resolves.
const LOCAL_CACHE_LIMIT = 20;
const localCache = new Map<string, MangaLocalState>();

function rememberLocal(path: string, state: MangaLocalState) {
  localCache.delete(path);
  localCache.set(path, state);

  if (localCache.size > LOCAL_CACHE_LIMIT) {
    const oldest = localCache.keys().next().value;

    if (oldest !== undefined) {
      localCache.delete(oldest);
    }
  }
}

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

export default function MangaScreen({ navigation, route }: Props) {
  const { path } = route.params;
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
  const [progress, setProgress] = useState<ReaderProgress | null>(
    () => localCache.get(path)?.progress ?? null,
  );
  const [readChapters, setReadChapters] = useState<string[]>(
    () => localCache.get(path)?.readChapters ?? [],
  );
  const [inLibrary, setInLibrary] = useState(
    () => localCache.get(path)?.inLibrary ?? false,
  );
  const [localLoaded, setLocalLoaded] = useState(
    () => localCache.has(path),
  );
  const [sortOrder, setSortOrder] = useState<ChapterSort>(
    () => viewCache.get(path)?.sort ?? 'asc',
  );
  const [activeRange, setActiveRange] = useState<number | null>(
    () => viewCache.get(path)?.range ?? null,
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;

      void Promise.all([
        loadProgress(path),
        loadReadChapters(path),
        isInLibrary(path),
      ]).then(([value, reads, saved]) => {
        if (active) {
          rememberLocal(path, {
            progress: value,
            readChapters: reads,
            inLibrary: saved,
          });
          setProgress(value);
          setReadChapters((current) =>
            current.length === reads.length &&
            reads.every((chapter) => current.includes(chapter))
              ? current
              : reads,
          );
          setInLibrary(saved);
          setLocalLoaded(true);
        }
      });

      return () => {
        active = false;
      };
    }, [path]),
  );

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
    rememberLocal(path, {
      progress,
      readChapters,
      inLibrary: !inLibrary,
    });
  };

  const resumeChapter = data
    ? data.chapters.find((chapter) => chapter.path === progress?.chapterPath)
    : undefined;
  // Ranges always read oldest to newest; sorting only flips chapters inside a
  // range. The source lists chapters newest first.
  const ascending = useMemo(
    () => ascendingChapters(data?.chapters ?? []),
    [data],
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
    goBackOrTabs(navigation);
  };
  const openMangaRelated = useCallback(
    (relatedPath: string, title: string) =>
      // Replace, not push: hopping through related titles must not grow the
      // stack, so back always lands on the tabs, like rokimu.
      navigation.replace('Manga', { path: relatedPath, title }),
    [navigation],
  );
  const openChapter = useCallback(
    (chapter: MangaChapter) =>
      navigation.navigate('Reader', {
        path: chapter.path,
        title: chapter.title,
        mangaPath: path,
      }),
    [navigation, path],
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
      {loading && !data ? (
        <MangaSkeleton topBar={topBar} />
      ) : hasError && !data ? (
        <View className="flex-1">
          {topBar}
          <ErrorState message="No se pudo cargar el manga" onRetry={reload} />
        </View>
      ) : data ? (
        <MangaChapterList
          topBar={topBar}
          manga={data}
          mangaPath={path}
          chapters={visibleChapters}
          ranges={ranges}
          rangeIndex={rangeIndex}
          sortOrder={sortOrder}
          readChapters={readChapters}
          currentChapterPath={progress?.chapterPath}
          resumeChapter={resumeChapter}
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

