import { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppPressable } from '../components/AppPressable';
import { Screen } from '../components/Screen';
import { SectionTitle } from '../components/SectionTitle';
import { useRemoteData } from '../hooks/useRemoteData';
import { fetchManga } from '../source/leercapitulo';
import type { MangaChapter, MangaDetail } from '../source/leercapitulo';
import type { RootStackParamList } from '../navigation/types';

const COVER_ASPECT_RATIO = 248 / 352;
const VISIBLE_FACTS = new Set([
  'Estado',
  'Tipo',
  'Demografia',
  'Autor',
  'Capitulos',
  'Actualizado',
]);

type Props = NativeStackScreenProps<RootStackParamList, 'Manga'>;

export default function MangaScreen({ navigation, route }: Props) {
  const { path } = route.params;
  const insets = useSafeAreaInsets();
  const fetcher = useCallback(
    (signal: AbortSignal) => fetchManga(path, signal),
    [path],
  );
  const { data, hasError, loading, reload } = useRemoteData(fetcher);

  return (
    <Screen>
      <View className="px-4 py-3">
        <AppPressable
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
        >
          <Text className="text-sm text-zinc-500 dark:text-zinc-400">Volver</Text>
        </AppPressable>
      </View>

      {loading && !data ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#71717a" />
        </View>
      ) : hasError && !data ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            No se pudo cargar el manga
          </Text>
          <AppPressable
            accessibilityRole="button"
            onPress={reload}
            className="mt-6 rounded-lg bg-zinc-900 px-5 py-2 dark:bg-zinc-100"
          >
            <Text className="text-sm font-semibold text-white dark:text-zinc-900">
              Reintentar
            </Text>
          </AppPressable>
        </View>
      ) : data ? (
        <FlatList
          data={data.chapters}
          keyExtractor={(item) => item.path}
          renderItem={({ item }) => (
            <ChapterRow
              item={item}
              onPress={() =>
                navigation.navigate('Reader', {
                  path: item.path,
                  title: item.title,
                })
              }
            />
          )}
          ListHeaderComponent={<MangaHeader manga={data} />}
          ListFooterComponent={<View style={{ height: insets.bottom + 24 }} />}
          contentContainerClassName="pb-2"
          showsVerticalScrollIndicator={false}
        />
      ) : null}
    </Screen>
  );
}

function MangaHeader({ manga }: { manga: MangaDetail }) {
  const facts = manga.facts.filter((fact) => VISIBLE_FACTS.has(fact.label));

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

      {facts.length > 0 ? (
        <View className="mt-6 px-4">
          {facts.map((fact) => (
            <View key={fact.label} className="flex-row py-1">
              <Text className="w-24 text-xs text-zinc-500 dark:text-zinc-400">
                {fact.label}
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
      className="flex-row items-center px-4 py-3"
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
