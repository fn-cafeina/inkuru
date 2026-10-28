import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppPressable } from '../components/AppPressable';
import { ErrorState } from '../components/ErrorState';
import { ListDivider } from '../components/ListDivider';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { SectionTitle } from '../components/SectionTitle';
import { Skeleton } from '../components/Skeleton';
import { useRemoteData } from '../hooks/useRemoteData';
import { addToLibrary, isInLibrary, removeFromLibrary } from '../storage/library';
import { loadProgress } from '../storage/readerProgress';
import type { ReaderProgress } from '../storage/readerProgress';
import { fetchManga } from '../source/leercapitulo';
import { useColors } from '../theme/colors';
import { COVER_ASPECT_RATIO } from '../theme/layout';
import type { MangaChapter, MangaDetail } from '../source/leercapitulo';
import type { RootStackParamList } from '../navigation/types';

const VISIBLE_FACTS = new Set([
  'Estado',
  'Tipo',
  'Demografia',
  'Autor',
  'Actualizado',
]);

const FACT_LABELS: Record<string, string> = {
  Demografia: 'Demografía',
};

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

  useFocusEffect(
    useCallback(() => {
      let active = true;

      void Promise.all([loadProgress(path), isInLibrary(path)]).then(
        ([value, saved]) => {
          if (active) {
            setProgress(value);
            setInLibrary(saved);
          }
        },
      );

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
  const chapters = useMemo(
    () =>
      data
        ? sortOrder === 'asc'
          ? [...data.chapters].reverse()
          : data.chapters
        : [],
    [data, sortOrder],
  );

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
            borderlessRipple
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
        <FlatList
          data={chapters}
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
              onToggleSort={() =>
                setSortOrder((current) => (current === 'desc' ? 'asc' : 'desc'))
              }
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

function MangaHeader({
  manga,
  resumeChapter,
  sortOrder,
  onToggleSort,
  onRead,
}: {
  manga: MangaDetail;
  resumeChapter?: MangaChapter;
  sortOrder: 'asc' | 'desc';
  onToggleSort: () => void;
  onRead: (chapter: MangaChapter) => void;
}) {
  const colors = useColors();
  const facts = manga.facts.filter((fact) => VISIBLE_FACTS.has(fact.label));
  const firstChapter = manga.chapters[manga.chapters.length - 1];
  const readChapter = resumeChapter ?? firstChapter;
  const [expanded, setExpanded] = useState(false);
  // shortcut: length heuristic, measure the rendered lines if the synopsis copy changes.
  const longSynopsis = manga.synopsis.length > 280;

  return (
    <View>
      <View className="flex-row px-4">
        <View
          className="overflow-hidden rounded-xl bg-zinc-200 dark:bg-zinc-800"
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
        </View>
      </View>

      {manga.tags.length > 0 ? (
        <View className="mt-3 flex-row flex-wrap gap-1.5 px-4">
          {manga.tags.map((tag) => (
            <View
              key={tag}
              className="rounded-full bg-zinc-100 px-2.5 py-1 dark:bg-zinc-800"
            >
              <Text className="text-xs text-zinc-600 dark:text-zinc-300">
                {tag}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {readChapter ? (
        <View className="mt-4 px-4">
          <AppPressable
            onPress={() => onRead(readChapter)}
            className="min-h-12 items-center justify-center rounded-xl bg-accent-500"
          >
            <Text className="text-sm font-semibold text-white">
              {resumeChapter
                ? `Continuar ${resumeChapter.title}`
                : 'Leer primer capítulo'}
            </Text>
          </AppPressable>
        </View>
      ) : null}

      {facts.length > 0 ? (
        <View className="mt-6 px-4">
          {facts.map((fact) => (
            <View key={fact.label} className="flex-row py-1">
              <Text className="w-24 text-xs text-zinc-500 dark:text-zinc-400">
                {FACT_LABELS[fact.label] ?? fact.label}
              </Text>
              <Text className="flex-1 text-xs text-zinc-700 dark:text-zinc-300">
                {FACT_VALUES[fact.value] ?? fact.value}
              </Text>
            </View>
          ))}
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

      <View className="mt-6 flex-row items-center px-4">
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
          borderlessRipple
          onPress={onToggleSort}
          className="min-h-11 min-w-11 items-center justify-center rounded-full"
        >
          <Feather
            name={sortOrder === 'desc' ? 'arrow-down' : 'arrow-up'}
            size={18}
            color={colors.textMuted}
          />
        </AppPressable>
      </View>
    </View>
  );
}

function MangaSkeleton() {
  return (
    <View>
      <View className="flex-row px-4">
        <Skeleton
          className="rounded-xl"
          style={{ width: 112, aspectRatio: COVER_ASPECT_RATIO }}
        />
        <View className="ml-4 flex-1">
          <Skeleton className="h-6 w-3/4 rounded" />
        </View>
      </View>
      <View className="mt-3 flex-row gap-1.5 px-4">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-14 rounded-full" />
      </View>
      <View className="mt-4 px-4">
        <Skeleton className="h-12 rounded-xl" />
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
