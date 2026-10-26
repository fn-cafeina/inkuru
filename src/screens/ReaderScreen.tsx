import { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Screen } from '../components/Screen';
import { useRemoteData } from '../hooks/useRemoteData';
import { fetchReader } from '../source/leercapitulo';
import type { MangaChapter, ReaderData } from '../source/leercapitulo';
import type { RootStackParamList } from '../navigation/types';

// shortcut: observed pages are 1442x2100, use onLoad dimensions if another ratio appears.
const PAGE_ASPECT_RATIO = 1442 / 2100;

type Props = NativeStackScreenProps<RootStackParamList, 'Reader'>;

export default function ReaderScreen({ navigation, route }: Props) {
  const { path, title } = route.params;
  const insets = useSafeAreaInsets();
  const fetcher = useCallback(
    (signal: AbortSignal) => fetchReader(path, signal),
    [path],
  );
  const { data, hasError, loading, reload } = useRemoteData(fetcher);

  return (
    <Screen>
      <View className="flex-row items-center px-4 py-3">
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
        >
          <Text className="text-sm text-zinc-500 dark:text-zinc-400">Volver</Text>
        </Pressable>
        <Text
          numberOfLines={1}
          className="ml-4 flex-1 text-sm text-zinc-700 dark:text-zinc-300"
        >
          {data?.title || title}
        </Text>
      </View>

      {loading && !data ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#71717a" />
        </View>
      ) : hasError && !data ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            No se pudo cargar el capítulo
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={reload}
            className="mt-6 rounded-lg bg-zinc-900 px-5 py-2 dark:bg-zinc-100"
          >
            <Text className="text-sm font-semibold text-white dark:text-zinc-900">
              Reintentar
            </Text>
          </Pressable>
        </View>
      ) : data ? (
        <ReaderPages
          data={data}
          bottomInset={insets.bottom}
          onOpen={(chapter) =>
            navigation.replace('Reader', {
              path: chapter.path,
              title: chapter.title,
            })
          }
        />
      ) : null}
    </Screen>
  );
}

function ReaderPages({
  data,
  bottomInset,
  onOpen,
}: {
  data: ReaderData;
  bottomInset: number;
  onOpen: (chapter: MangaChapter) => void;
}) {
  const { width } = useWindowDimensions();
  const height = width / PAGE_ASPECT_RATIO;
  const { prev, next } = data;

  return (
    <FlatList
      data={data.pages}
      keyExtractor={(item) => item}
      renderItem={({ item, index }) => (
        <Image
          source={{ uri: item }}
          style={{ width, height }}
          resizeMode="contain"
          accessibilityLabel={`Página ${index + 1}`}
          className="bg-zinc-200 dark:bg-zinc-800"
        />
      )}
      ListFooterComponent={
        <View
          className="flex-row px-4 pt-8"
          style={{ paddingBottom: bottomInset + 24 }}
        >
          {prev ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={prev.title}
              onPress={() => onOpen(prev)}
              className="mr-3 flex-1 items-center justify-center rounded-lg border border-zinc-200 py-3 dark:border-zinc-800"
            >
              <Text
                numberOfLines={1}
                className="text-sm text-zinc-700 dark:text-zinc-300"
              >
                ‹ {prev.title}
              </Text>
            </Pressable>
          ) : null}
          {next ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={next.title}
              onPress={() => onOpen(next)}
              className="flex-1 items-center justify-center rounded-lg border border-zinc-200 py-3 dark:border-zinc-800"
            >
              <Text
                numberOfLines={1}
                className="text-sm text-zinc-700 dark:text-zinc-300"
              >
                {next.title} ›
              </Text>
            </Pressable>
          ) : null}
        </View>
      }
      showsVerticalScrollIndicator={false}
    />
  );
}
