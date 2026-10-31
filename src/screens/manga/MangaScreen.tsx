import { useCallback, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppPressable } from '../../components/AppPressable';
import { ErrorState } from '../../components/ErrorState';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { MangaChapterList } from './components/MangaChapterList';
import { MangaSkeleton } from './components/MangaSkeleton';
import { useRemoteData } from '../../hooks/useRemoteData';
import { addToLibrary, isInLibrary, removeFromLibrary } from '../../storage/library';
import { loadProgress, loadReadChapters } from '../../storage/readerProgress';
import type { ReaderProgress } from '../../storage/readerProgress';
import { isMangaDetail } from '../../source/guards';
import { fetchManga } from '../../source/zonatmo';
import type { MangaDetail } from '../../source/zonatmo';
import { CACHE_FRESH_MS } from '../../storage/queryCache';
import { useColors } from '../../theme/colors';
import type { RootStackParamList } from '../../navigation/types';
import {
  ascendingChapters,
  chunkChapters,
  displayChapters,
} from './chapters';
import type { ChapterSort } from './chapters';

type Props = NativeStackScreenProps<RootStackParamList, 'Manga'>;

type MangaLocalState = {
  progress: ReaderProgress | null;
  readChapters: string[];
  inLibrary: boolean;
};

// Keep the last local state per manga so reopening a title does not flash the
// wrong CTA while AsyncStorage resolves.
const localCache = new Map<string, MangaLocalState>();

function mangaTitle(data: MangaDetail | null, fallback?: string): string {
  return data?.title ?? fallback ?? '';
}

export default function MangaScreen({ navigation, route }: Props) {
  const { path, title } = route.params;
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const fetcher = useCallback(
    (signal: AbortSignal) => fetchManga(path, signal),
    [path],
  );
  const { data, hasError, loading, reload, refreshing, refresh } =
    useRemoteData(fetcher, `manga:${path}`, {
      freshMs: CACHE_FRESH_MS.manga,
      persist: true,
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
  const [sortOrder, setSortOrder] = useState<ChapterSort>('asc');
  const [activeRange, setActiveRange] = useState(0);
  const [barTitleVisible, setBarTitleVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      void Promise.all([
        loadProgress(path),
        loadReadChapters(path),
        isInLibrary(path),
      ]).then(([value, reads, saved]) => {
        if (active) {
          localCache.set(path, {
            progress: value,
            readChapters: reads,
            inLibrary: saved,
          });
          setProgress(value);
          setReadChapters(reads);
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
    localCache.set(path, {
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
  const rangeIndex = Math.min(
    activeRange,
    Math.max(ranges.length - 1, 0),
  );
  const activeChapters = ranges[rangeIndex]?.chapters ?? [];
  const visibleChapters = displayChapters(activeChapters, sortOrder);

  const toggleSort = () => {
    setSortOrder((current) => (current === 'desc' ? 'asc' : 'desc'));
  };

  const selectRange = (index: number) => {
    setActiveRange(index);
  };
  const goBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] });
  };
  const showRefreshError = hasError && data !== null;

  return (
    <Screen>
      <ScreenHeader
        title={mangaTitle(data, title)}
        titleVisible={barTitleVisible}
        onBack={goBack}
        action={
          <AppPressable
            accessibilityLabel={
              inLibrary
                ? 'Quitar de la biblioteca'
                : 'Añadir a la biblioteca'
            }
            accessibilityState={{ selected: inLibrary }}
            disabled={!data && !inLibrary}
            onPress={() => {
              void toggleLibrary();
            }}
            className="min-h-12 min-w-12 items-center justify-center rounded-full"
          >
            <Feather
              name="bookmark"
              size={20}
              color={inLibrary ? colors.accent : colors.iconInactive}
            />
          </AppPressable>
        }
      />

      {loading && !data ? (
        <MangaSkeleton />
      ) : hasError && !data ? (
        <ErrorState message="No se pudo cargar el manga" onRetry={reload} />
      ) : data ? (
        <MangaChapterList
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
          titleVisible={barTitleVisible}
          refreshing={refreshing}
          refreshError={showRefreshError}
          ready={localLoaded}
          onRefresh={refresh}
          onSelectRange={selectRange}
          onToggleSort={toggleSort}
          onOpen={(chapter) =>
            navigation.navigate('Reader', {
              path: chapter.path,
              title: chapter.title,
              mangaPath: path,
            })
          }
          onScrollPast={setBarTitleVisible}
        />
      ) : (
        <ErrorState message="Manga no disponible" onRetry={reload} />
      )}
    </Screen>
  );
}

