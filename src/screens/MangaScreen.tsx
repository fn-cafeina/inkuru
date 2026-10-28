import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import type { LayoutChangeEvent, ScrollViewInstance } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppPressable } from '../components/AppPressable';
import { ErrorState } from '../components/ErrorState';
import { ListDivider } from '../components/ListDivider';
import { OptionChip } from '../components/OptionChip';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { SectionTitle } from '../components/SectionTitle';
import { Skeleton } from '../components/Skeleton';
import { useRemoteData } from '../hooks/useRemoteData';
import { addToLibrary, isInLibrary, removeFromLibrary } from '../storage/library';
import {
  loadMangaRange,
  loadMangaSort,
  saveMangaRange,
  saveMangaSort,
} from '../storage/mangaSettings';
import { loadProgress } from '../storage/readerProgress';
import type { ReaderProgress } from '../storage/readerProgress';
import { fetchManga } from '../source/leercapitulo';
import { useColors } from '../theme/colors';
import { COVER_ASPECT_RATIO } from '../theme/layout';
import type { MangaChapter, MangaDetail } from '../source/leercapitulo';
import type { RootStackParamList } from '../navigation/types';

const FACT_VALUES: Record<string, string> = {
  Ongoing: 'En emisión',
  Completed: 'Completa',
  Cancelled: 'Cancelada',
  Canceled: 'Cancelada',
  Hiatus: 'En pausa',
};

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
  const [inLibrary, setInLibrary] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [activeRange, setActiveRange] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      void Promise.all([
        loadProgress(path),
        isInLibrary(path),
        loadMangaSort(),
        loadMangaRange(path),
      ]).then(([value, saved, storedSort, storedRange]) => {
        if (active) {
          setProgress(value);
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
        title={data?.title ?? title ?? ''}
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
              item={item}
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
            <View className="px-4 py-6">
              <Text className="text-sm text-zinc-500 dark:text-zinc-400">
                Sin capítulos disponibles.
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} />
          }
          contentContainerClassName="pb-2"
          showsVerticalScrollIndicator={false}
        />
      ) : null}
    </Screen>
  );
}

// gap-1.5 between chips; must match the Tailwind class on the rows below.
const TAG_ROW_GAP = 6;

function TagChip({
  label,
  onLayout,
}: {
  label: string;
  onLayout?: (event: LayoutChangeEvent) => void;
}) {
  return (
    <View
      onLayout={onLayout}
      className="rounded-md bg-zinc-100 px-2.5 py-1 dark:bg-zinc-800"
    >
      <Text className="text-xs text-zinc-600 dark:text-zinc-300">{label}</Text>
    </View>
  );
}

/** Two rows max; tags after the second row collapse into +N. */
function TagRow({ tags }: { tags: string[] }) {
  const [available, setAvailable] = useState(0);
  const [widths, setWidths] = useState<Record<number, number>>({});
  const record = (index: number, width: number) =>
    setWidths((current) =>
      current[index] === width ? current : { ...current, [index]: width },
    );

  const measured =
    available > 0 &&
    tags.every((_, index) => widths[index] !== undefined) &&
    widths[tags.length] !== undefined;

  const rows = measured
    ? layoutTagRows(tags.length, widths, available, widths[tags.length])
    : null;

  return (
    <View
      onLayout={(event) => setAvailable(event.nativeEvent.layout.width)}
      className="gap-1.5"
    >
      {rows ? (
        <>
          {rows.first.length > 0 ? (
            <View className="flex-row gap-1.5 overflow-hidden">
              {rows.first.map((index) => (
                <TagChip key={`${tags[index]}-${index}`} label={tags[index]} />
              ))}
            </View>
          ) : null}
          {rows.second.length > 0 || rows.hidden > 0 ? (
            <View className="flex-row gap-1.5 overflow-hidden">
              {rows.second.map((index) => (
                <TagChip key={`${tags[index]}-${index}`} label={tags[index]} />
              ))}
              {rows.hidden > 0 ? <TagChip label={`+${rows.hidden}`} /> : null}
            </View>
          ) : null}
        </>
      ) : (
        <View className="flex-row gap-1.5 overflow-hidden">
          {tags.map((tag, index) => (
            <TagChip
              key={`${tag}-${index}`}
              label={tag}
              onLayout={(event) =>
                record(index, event.nativeEvent.layout.width)
              }
            />
          ))}
          {/* Probe wide enough for the largest possible hidden count. */}
          <TagChip
            label={`+${tags.length}`}
            onLayout={(event) =>
              record(tags.length, event.nativeEvent.layout.width)
            }
          />
        </View>
      )}
    </View>
  );
}

function layoutTagRows(
  count: number,
  widths: Record<number, number>,
  available: number,
  overflowWidth: number,
) {
  const indices = (from: number, length: number) =>
    Array.from({ length }, (_, offset) => from + offset);

  let firstCount = 0;
  let used = 0;

  while (firstCount < count) {
    const next = used + (firstCount > 0 ? TAG_ROW_GAP : 0) + widths[firstCount];

    if (next > available) {
      break;
    }

    used = next;
    firstCount += 1;
  }

  if (firstCount === count) {
    return { first: indices(0, count), second: [], hidden: 0 };
  }

  let secondCount = 0;
  used = 0;

  while (firstCount + secondCount < count) {
    const index = firstCount + secondCount;
    const next =
      used + (secondCount > 0 ? TAG_ROW_GAP : 0) + widths[index];

    if (next > available) {
      break;
    }

    used = next;
    secondCount += 1;
  }

  if (firstCount + secondCount === count) {
    return {
      first: indices(0, firstCount),
      second: indices(firstCount, secondCount),
      hidden: 0,
    };
  }

  // The second row must also fit the +N chip.
  secondCount = 0;
  used = 0;

  while (firstCount + secondCount < count) {
    const index = firstCount + secondCount;
    const next =
      used +
      (secondCount > 0 ? TAG_ROW_GAP : 0) +
      widths[index] +
      TAG_ROW_GAP +
      overflowWidth;

    if (next > available) {
      break;
    }

    used += (secondCount > 0 ? TAG_ROW_GAP : 0) + widths[index];
    secondCount += 1;
  }

  return {
    first: indices(0, firstCount),
    second: indices(firstCount, secondCount),
    hidden: count - firstCount - secondCount,
  };
}

const CHAPTER_RANGE_SIZE = 50;

type ChapterRange = {
  label: string;
  chapters: MangaChapter[];
};

function chunkChapters(chapters: MangaChapter[]): ChapterRange[] {
  const ranges: ChapterRange[] = [];

  for (let start = 0; start < chapters.length; start += CHAPTER_RANGE_SIZE) {
    const slice = chapters.slice(start, start + CHAPTER_RANGE_SIZE);

    ranges.push({ label: rangeLabel(slice, start), chapters: slice });
  }

  return ranges;
}

function rangeLabel(chapters: MangaChapter[], start: number): string {
  const first = chapterNumber(chapters[0]?.title);
  const last = chapterNumber(chapters[chapters.length - 1]?.title);

  if (first !== undefined && last !== undefined) {
    const low = Math.min(first, last);
    const high = Math.max(first, last);

    return low === high ? `${low}` : `${low}-${high}`;
  }

  return `${start + 1}-${start + chapters.length}`;
}

function chapterNumber(title?: string): number | undefined {
  const match = title?.match(/\d+(?:[.,]\d+)?/);

  return match ? Number(match[0].replace(',', '.')) : undefined;
}

function MangaHeader({
  manga,
  resumeChapter,
  sortOrder,
  ranges,
  activeRange,
  onSelectRange,
  onToggleSort,
  onRead,
}: {
  manga: MangaDetail;
  resumeChapter?: MangaChapter;
  sortOrder: 'asc' | 'desc';
  ranges: ChapterRange[];
  activeRange: number;
  onSelectRange: (index: number) => void;
  onToggleSort: () => void;
  onRead: (chapter: MangaChapter) => void;
}) {
  const colors = useColors();
  const chipRowRef = useRef<ScrollViewInstance>(null);
  const factValue = (label: string) => {
    const value = manga.facts.find((fact) => fact.label === label)?.value;

    return value ? FACT_VALUES[value] ?? value : undefined;
  };
  const meta = [factValue('Estado'), factValue('Tipo'), factValue('Demografia')]
    .filter((value): value is string => Boolean(value))
    .join(' · ');
  const author = factValue('Autor');
  const updated = factValue('Actualizado');
  const firstChapter = manga.chapters[manga.chapters.length - 1];
  const readChapter = resumeChapter ?? firstChapter;
  const [expanded, setExpanded] = useState(false);
  // shortcut: length heuristic, measure the rendered lines if the synopsis copy changes.
  const longSynopsis = manga.synopsis.length > 280;

  return (
    <View>
      <View className="flex-row px-4">
        <View
          className="overflow-hidden rounded-lg bg-zinc-200 dark:bg-zinc-800"
          style={{ width: 112, aspectRatio: COVER_ASPECT_RATIO }}
        >
          <Image
            source={{ uri: manga.cover }}
            className="h-full w-full"
            resizeMode="cover"
            accessible={false}
          />
        </View>
        <View className="ml-4 flex-1">
          <Text
            numberOfLines={3}
            className="text-xl font-semibold text-zinc-900 dark:text-zinc-100"
          >
            {manga.title}
          </Text>
          {meta ? (
            <Text
              numberOfLines={1}
              className="mt-1 text-xs text-zinc-500 dark:text-zinc-400"
            >
              {meta}
            </Text>
          ) : null}
          {author ? (
            <Text
              numberOfLines={2}
              className="mt-1 text-sm text-zinc-700 dark:text-zinc-300"
            >
              {author}
            </Text>
          ) : null}
          {updated ? (
            <Text className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {`Actualizado ${updated}`}
            </Text>
          ) : null}
        </View>
      </View>

      {readChapter ? (
        <View className="mt-4 px-4">
          <AppPressable
            onPress={() => onRead(readChapter)}
            className="min-h-14 items-center justify-center rounded-lg bg-accent-500"
          >
            <Text className="text-sm font-semibold text-white">
              {resumeChapter
                ? `Continuar ${resumeChapter.title}`
                : 'Leer primer capítulo'}
            </Text>
          </AppPressable>
        </View>
      ) : null}

      {manga.tags.length > 0 ? (
        <View className="mt-4 px-4">
          <TagRow tags={manga.tags} />
        </View>
      ) : null}

      {manga.synopsis ? (
        <View>
          <SectionTitle className="mb-3 mt-7 px-4">Sinopsis</SectionTitle>
          <Text
            numberOfLines={!expanded && longSynopsis ? 6 : undefined}
            className="px-4 text-sm text-zinc-700 dark:text-zinc-300"
          >
            {manga.synopsis}
          </Text>
          {longSynopsis ? (
            <AppPressable
              accessibilityLabel={expanded ? 'Ver menos' : 'Ver más'}
              onPress={() => setExpanded((value) => !value)}
              className="mt-1 min-h-12 justify-center px-4 self-start"
            >
              <Text className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                {expanded ? 'Ver menos' : 'Ver más'}
              </Text>
            </AppPressable>
          ) : null}
        </View>
      ) : null}

      <View className="mt-6 px-4">
        {ranges.length > 1 ? (
          <ScrollView
            ref={chipRowRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            // A saved selection on the last range would start off screen.
            onContentSizeChange={() => {
              if (ranges.length > 0 && activeRange === ranges.length - 1) {
                chipRowRef.current?.scrollToEnd({ animated: false });
              }
            }}
            contentContainerClassName="gap-2 pb-3"
          >
            {ranges.map((range, index) => (
              <OptionChip
                key={`${range.label}-${index}`}
                label={range.label}
                selected={index === activeRange}
                onPress={() => onSelectRange(index)}
              />
            ))}
          </ScrollView>
        ) : null}
        <View className="flex-row items-center">
          <SectionTitle className="flex-1">
            {`${manga.chapters.length} capítulos`}
          </SectionTitle>
          <AppPressable
            accessibilityLabel={
              sortOrder === 'desc'
                ? 'Ordenar capítulos ascendente'
                : 'Ordenar capítulos descendente'
            }
            accessibilityState={{ selected: sortOrder === 'asc' }}
            onPress={onToggleSort}
            className="min-h-11 min-w-11 items-center justify-center rounded-lg"
          >
            <Feather
              name={sortOrder === 'desc' ? 'arrow-down' : 'arrow-up'}
              size={18}
              color={colors.textMuted}
            />
          </AppPressable>
        </View>
      </View>
    </View>
  );
}

function MangaSkeleton() {
  return (
    <View>
      <View className="flex-row px-4">
        <Skeleton
          className="rounded-lg"
          style={{ width: 112, aspectRatio: COVER_ASPECT_RATIO }}
        />
        <View className="ml-4 flex-1">
          <Skeleton className="h-6 w-3/4 rounded" />
          <Skeleton className="mt-2 h-3 w-1/2 rounded" />
          <Skeleton className="mt-2 h-4 w-2/3 rounded" />
        </View>
      </View>
      <View className="mt-4 px-4">
        <Skeleton className="h-14 rounded-lg" />
      </View>
      <View className="mt-4 gap-1.5 px-4">
        <View className="flex-row gap-1.5">
          <Skeleton className="h-6 w-16 rounded-md" />
          <Skeleton className="h-6 w-20 rounded-md" />
          <Skeleton className="h-6 w-14 rounded-md" />
        </View>
        <View className="flex-row gap-1.5">
          <Skeleton className="h-6 w-12 rounded-md" />
          <Skeleton className="h-6 w-16 rounded-md" />
        </View>
      </View>
      <View className="mt-6 px-4">
        <Skeleton className="h-3 w-24 rounded" />
        <Skeleton className="mt-3 h-4 w-5/6 rounded" />
        <Skeleton className="mt-2 h-4 w-2/3 rounded" />
      </View>
      <View className="mt-7 px-4">
        <Skeleton className="h-3 w-28 rounded" />
      </View>
      {Array.from({ length: 8 }, (_, index) => (
        <View key={index} className="px-4 py-3">
          <Skeleton
            className="h-4 rounded"
            style={{ width: `${55 + (index % 3) * 15}%` }}
          />
        </View>
      ))}
    </View>
  );
}

function ChapterRow({
  item,
  onPress,
}: {
  item: MangaChapter;
  onPress: () => void;
}) {
  return (
    <AppPressable
      accessibilityRole="button"
      accessibilityLabel={item.title}
      onPress={onPress}
      className="min-h-12 flex-row items-center px-4 py-3"
    >
      <Text
        numberOfLines={1}
        className="flex-1 text-sm text-zinc-900 dark:text-zinc-100"
      >
        {item.title}
      </Text>
      {item.date ? (
        <Text className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
          {item.date}
        </Text>
      ) : null}
    </AppPressable>
  );
}
