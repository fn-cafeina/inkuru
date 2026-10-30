import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, RefreshControl, View } from 'react-native';
import type {
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppPressable } from '../../components/AppPressable';
import { ChapterRow } from '../../components/ChapterRow';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { ListDivider } from '../../components/ListDivider';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { MangaHeader } from './components/MangaHeader';
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
import { useColors } from '../../theme/colors';
import type { RootStackParamList } from '../../navigation/types';
import { chunkChapters } from './chapters';

type ChapterState = 'current' | 'read';

type Props = NativeStackScreenProps<RootStackParamList, 'Manga'>;

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
  const readSet = useMemo(() => new Set(readChapters), [readChapters]);
  const chapterState = (chapterPath: string): ChapterState | undefined => {
    if (chapterPath === progress?.chapterPath) {
      return 'current';
    }

    return readSet.has(chapterPath) ? 'read' : undefined;
  };

  const toggleSort = () => {
    const next = sortOrder === 'desc' ? 'asc' : 'desc';

    setSortOrder(next);
    void saveMangaSort(next);
  };

  const selectRange = (index: number) => {
    setActiveRange(index);
    void saveMangaRange(path, index);
  };

  const onListScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const visible = event.nativeEvent.contentOffset.y > 120;

    if (visible !== barTitleVisible) {
      setBarTitleVisible(visible);
    }
  };

  return (
    <Screen>
      <ScreenHeader
        title={data?.title ?? title ?? ''}
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
        <FlatList
          data={visibleChapters}
          keyExtractor={(item) => item.path}
          ItemSeparatorComponent={ListDivider}
          renderItem={({ item }) => (
            <ChapterRow
              title={item.title}
              date={item.date}
              state={chapterState(item.path)}
              onPress={() =>
                navigation.navigate('Reader', {
                  path: item.path,
                  title: item.title,
                  mangaPath: path,
                })
              }
            />
          )}
          ListHeaderComponent={
            <MangaHeader
              manga={data}
              readCount={readSet.size}
              resumeChapter={resumeChapter}
              sortOrder={sortOrder}
              ranges={ranges}
              activeRange={rangeIndex}
              onSelectRange={selectRange}
              onToggleSort={toggleSort}
              onRead={(chapter) =>
                navigation.navigate('Reader', {
                  path: chapter.path,
                  title: chapter.title,
                  mangaPath: path,
                })
              }
            />
          }
          ListFooterComponent={<View style={{ height: insets.bottom + 24 }} />}
          ListEmptyComponent={
            <EmptyState title="Sin capítulos disponibles" />
          }
          onScroll={onListScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} />
          }
          contentContainerStyle={{ flexGrow: 1 }}
          contentContainerClassName="pb-2"
          showsVerticalScrollIndicator={false}
        />
      ) : null}
    </Screen>
  );
}

