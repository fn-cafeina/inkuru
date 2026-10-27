import { useCallback, useState } from 'react';
import {
  FlatList,
  Image,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppPressable } from '../components/AppPressable';
import { ErrorState } from '../components/ErrorState';
import { ListDivider } from '../components/ListDivider';
import { LoadingState } from '../components/LoadingState';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { SectionTitle } from '../components/SectionTitle';
import { useRemoteData } from '../hooks/useRemoteData';
import { loadProgress } from '../storage/readerProgress';
import type { ReaderProgress } from '../storage/readerProgress';
import { fetchManga } from '../source/leercapitulo';
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

type Props = NativeStackScreenProps<RootStackParamList, 'Manga'>;

export default function MangaScreen({ navigation, route }: Props) {
  const { path, title } = route.params;
  const insets = useSafeAreaInsets();
  const fetcher = useCallback(
    (signal: AbortSignal) => fetchManga(path, signal),
    [path],
  );
  const { data, hasError, loading, reload, refreshing, refresh } =
    useRemoteData(fetcher);
  const [progress, setProgress] = useState<ReaderProgress | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      void loadProgress(path).then((value) => {
        if (active) {
          setProgress(value);
        }
      });

      return () => {
        active = false;
      };
    }, [path]),
  );

  const resumeChapter = data
    ? data.chapters.find((chapter) => chapter.path === progress?.chapterPath)
    : undefined;

  return (
    <Screen>
      <ScreenHeader
        title={data?.title ?? title ?? ''}
        onBack={() => navigation.goBack()}
      />

      {loading && !data ? (
        <LoadingState />
      ) : hasError && !data ? (
        <ErrorState message="No se pudo cargar el manga" onRetry={reload} />
      ) : data ? (
        <FlatList
          data={data.chapters}
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
  onRead,
}: {
  manga: MangaDetail;
  resumeChapter?: MangaChapter;
  onRead: (chapter: MangaChapter) => void;
}) {
  const facts = manga.facts.filter((fact) => VISIBLE_FACTS.has(fact.label));
  const firstChapter = manga.chapters[manga.chapters.length - 1];
  const readChapter = resumeChapter ?? firstChapter;

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
          {manga.tags.length > 0 ? (
            <Text
              numberOfLines={2}
              className="mt-2 text-xs text-zinc-500 dark:text-zinc-400"
            >
              {manga.tags.join(' · ')}
            </Text>
          ) : null}
        </View>
      </View>

      {readChapter ? (
        <View className="mt-4 px-4">
          <AppPressable
            onPress={() => onRead(readChapter)}
            className="min-h-12 items-center justify-center rounded-lg bg-zinc-900 dark:bg-zinc-100"
          >
            <Text className="text-sm font-semibold text-white dark:text-zinc-900">
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
                {fact.value}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {manga.synopsis ? (
        <View className="mt-6">
          <SectionTitle>Sinopsis</SectionTitle>
          <Text className="px-4 text-sm text-zinc-700 dark:text-zinc-300">
            {manga.synopsis}
          </Text>
        </View>
      ) : null}

      <View className="mt-6">
        <SectionTitle>Capítulos</SectionTitle>
      </View>
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
