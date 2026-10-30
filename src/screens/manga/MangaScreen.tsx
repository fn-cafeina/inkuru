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
import {
  loadMangaRange,
  loadMangaSort,
  saveMangaRange,
  saveMangaSort,
} from '../../storage/mangaSettings';
import { loadProgress, loadReadChapters } from '../../storage/readerProgress';
import type { ReaderProgress } from '../../storage/readerProgress';
import { fetchManga } from '../../source/leercapitulo';
import type { MangaDetail } from '../../source/leercapitulo';
import { useColors } from '../../theme/colors';
import type { RootStackParamList } from '../../navigation/types';
import { chunkChapters } from './chapters';

type Props = NativeStackScreenProps<RootStackParamList, 'Manga'>;

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
    useRemoteData(fetcher, `manga:${path}`);
  const [progress, setProgress] = useState<ReaderProgress | null>(null);
  const [readChapters, setReadChapters] = useState<string[]>([]);
  const [inLibrary, setInLibrary] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [activeRange, setActiveRange] = useState<number | null>(null);
  const [barTitleVisible, setBarTitleVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      void Promise.all([
        loadProgress(path),
        loadReadChapters(path),
        isInLibrary(path),
        loadMangaSort(),
        loadMangaRange(path),
      ]).then(([value, reads, saved, storedSort, storedRange]) => {
        if (active) {
          setProgress(value);
          setReadChapters(reads);
          setInLibrary(saved);

          if (storedSort) {
            setSortOrder(storedSort);
          }

          if (storedRange !== null) {
            setActiveRange(storedRange);
          }
        }
      });

      return () => {
        active = false;
      };
    }, [path]),
  );

  const toggleLibrary = async () => {
    if (!data) {
      return;
    }

    const ok = inLibrary
      ? await removeFromLibrary(path)
      : await addToLibrary({
          path,
          title: data.title,
          cover: data.cover,
          addedAt: Date.now(),
        });

    if (!ok) {
      Alert.alert('No se pudo actualizar la biblioteca');
      return;
    }

    setInLibrary(!inLibrary);
  };

  const resumeChapter = data
    ? data.chapters.find((chapter) => chapter.path === progress?.chapterPath)
    : undefined;
  // Ranges always read oldest to newest; sorting only flips chapters inside a
  // range. The source lists chapters newest first.
  const ascending = useMemo(
    () => [...(data?.chapters ?? [])].reverse(),
    [data],
  );
  const ranges = useMemo(() => chunkChapters(ascending), [ascending]);
  const rangeIndex =
    activeRange === null
      ? 0
      : Math.min(activeRange, Math.max(ranges.length - 1, 0));
  const activeChapters = ranges[rangeIndex]?.chapters ?? [];
  const visibleChapters =
    sortOrder === 'desc' ? [...activeChapters].reverse() : activeChapters;

  const toggleSort = () => {
    const next = sortOrder === 'desc' ? 'asc' : 'desc';

    setSortOrder(next);
    void saveMangaSort(next);
  };

  const selectRange = (index: number) => {
    setActiveRange(index);
    void saveMangaRange(path, index);
  };

  return (
    <Screen>
      <ScreenHeader
        title={mangaTitle(data, title)}
        titleVisible={barTitleVisible}
        onBack={() => navigation.goBack()}
        action={
          <AppPressable
            accessibilityLabel={
              inLibrary
                ? 'Quitar de la biblioteca'
                : 'Añadir a la biblioteca'
            }
            accessibilityState={{ selected: inLibrary }}
            disabled={!data}
            onPress={() => {
              void toggleLibrary();
            }}
            className="min-h-12 min-w-12 items-center justify-center rounded-lg"
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
      ) : null}
    </Screen>
  );
}

