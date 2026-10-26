import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fetchHome } from '../source/leercapitulo';
import type {
  HomeData,
  HomeRelease,
  HomeSideItem,
  HomeTrending,
} from '../source/leercapitulo';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [home, setHome] = useState<HomeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const requestRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);

  const request = useCallback(async () => {
    controllerRef.current?.abort();

    const controller = new AbortController();
    controllerRef.current = controller;
    const requestId = ++requestRef.current;
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const data = await fetchHome(controller.signal);

      if (requestId === requestRef.current) {
        setHome(data);
        setError(null);
      }
    } catch (cause) {
      if (requestId === requestRef.current) {
        setError(cause instanceof Error ? cause.message : 'Error desconocido');
      }
    } finally {
      clearTimeout(timeout);

      if (requestId === requestRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the request updates state after fetch resolves
    void request();

    return () => {
      requestRef.current += 1;
      controllerRef.current?.abort();
    };
  }, [request]);

  if (loading && !home) {
    return (
      <Screen topInset={insets.top}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#71717a" />
          <Text className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
            Cargando inicio...
          </Text>
        </View>
      </Screen>
    );
  }

  if (error && !home) {
    return (
      <Screen topInset={insets.top}>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            No se pudo cargar el inicio
          </Text>
          <Text className="mt-2 text-center text-sm text-zinc-500 dark:text-zinc-400">
            {error}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setLoading(true);
              setError(null);
              void request();
            }}
            className="mt-6 rounded-full bg-zinc-900 px-5 py-2 dark:bg-zinc-100"
          >
            <Text className="text-sm font-semibold text-white dark:text-zinc-900">
              Reintentar
            </Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  if (!home) {
    return (
      <Screen topInset={insets.top}>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-sm text-zinc-500 dark:text-zinc-400">
            No hay datos para mostrar.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen topInset={insets.top}>
      <FlatList
        data={home.releases}
        keyExtractor={(item) => item.path}
        renderItem={({ item }) => <ReleaseCard item={item} />}
        ListHeaderComponent={
          <View>
            <Header error={error} />
            <TrendingRail items={home.trending} />
            <View className="mt-8">
              <SectionTitle>Últimos capítulos</SectionTitle>
            </View>
          </View>
        }
        ListFooterComponent={
          <View>
            <SideRail title="Populares" items={home.popular} />
            <SideRail title="Últimos mangas" items={home.latest} />
            <Text className="mt-10 px-4 text-center text-xs text-zinc-400 dark:text-zinc-500">
              Fuente: leercapitulo.co
            </Text>
            <View style={{ height: insets.bottom + 24 }} />
          </View>
        }
        contentContainerClassName="pb-2"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              setError(null);
              void request();
            }}
          />
        }
      />
    </Screen>
  );
}

function Screen({
  topInset,
  children,
}: {
  topInset: number;
  children: ReactNode;
}) {
  return (
    <View className="flex-1 bg-zinc-50 dark:bg-zinc-950">
      <View style={{ height: topInset }} />
      {children}
    </View>
  );
}

function Header({ error }: { error: string | null }) {
  return (
    <View className="px-4 pb-6 pt-3">
      <Text className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
        inkuru
      </Text>
      <Text className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Manga al día
      </Text>
      {error ? (
        <Text
          numberOfLines={2}
          className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950 dark:text-red-300"
        >
          No se pudo actualizar: {error}
        </Text>
      ) : null}
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <Text
      accessibilityRole="header"
      className="mb-3 px-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100"
    >
      {children}
    </Text>
  );
}

function TrendingRail({ items }: { items: HomeTrending[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <View>
      <SectionTitle>Tendencias</SectionTitle>
      <FlatList
        horizontal
        data={items}
        keyExtractor={(item) => item.path}
        renderItem={({ item }) => <TrendingCard item={item} />}
        ItemSeparatorComponent={RailSeparator}
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="px-4"
      />
    </View>
  );
}

function SideRail({
  title,
  items,
}: {
  title: string;
  items: HomeSideItem[];
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <View className="mt-8">
      <SectionTitle>{title}</SectionTitle>
      <FlatList
        horizontal
        data={items}
        keyExtractor={(item) => item.path}
        renderItem={({ item }) => <SideCard item={item} />}
        ItemSeparatorComponent={RailSeparator}
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="px-4"
      />
    </View>
  );
}

function TrendingCard({ item }: { item: HomeTrending }) {
  return (
    <View className="w-28">
      <Image
        source={{ uri: item.cover }}
        className="h-40 w-28 rounded-lg bg-zinc-200 dark:bg-zinc-800"
        resizeMode="cover"
        accessible={false}
      />
      <Text
        numberOfLines={2}
        className="mt-2 text-sm font-medium text-zinc-900 dark:text-zinc-100"
      >
        {item.title}
      </Text>
      {item.latestChapter ? (
        <Text
          numberOfLines={1}
          className="mt-1 text-xs text-zinc-500 dark:text-zinc-400"
        >
          {item.latestChapter.title}
        </Text>
      ) : null}
    </View>
  );
}

function SideCard({ item }: { item: HomeSideItem }) {
  return (
    <View className="w-24">
      <Image
        source={{ uri: item.cover }}
        className="h-36 w-24 rounded-lg bg-zinc-200 dark:bg-zinc-800"
        resizeMode="cover"
        accessible={false}
      />
      <Text
        numberOfLines={2}
        className="mt-2 text-sm font-medium text-zinc-900 dark:text-zinc-100"
      >
        {item.title}
      </Text>
      <Text
        numberOfLines={1}
        className="mt-1 text-xs text-zinc-500 dark:text-zinc-400"
      >
        {item.lastChapter}
      </Text>
    </View>
  );
}

function ReleaseCard({ item }: { item: HomeRelease }) {
  return (
    <View className="flex-row px-4 py-3">
      <Image
        source={{ uri: item.cover }}
        className="mr-3 h-24 w-16 rounded-md bg-zinc-200 dark:bg-zinc-800"
        resizeMode="cover"
        accessible={false}
      />
      <View className="flex-1">
        <Text
          numberOfLines={2}
          className="text-sm font-semibold text-zinc-900 dark:text-zinc-100"
        >
          {item.title}
        </Text>
        <View className="mt-2">
          {item.chapters.map((chapter) => (
            <View key={chapter.path} className="mt-1 flex-row items-center">
              <Text
                numberOfLines={1}
                className="flex-1 text-xs text-zinc-700 dark:text-zinc-300"
              >
                {chapter.title}
              </Text>
              {chapter.time ? (
                <Text className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                  {chapter.time}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function RailSeparator() {
  return <View className="w-3" />;
}
