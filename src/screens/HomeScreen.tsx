import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fetchHome } from '../source/leercapitulo';
import type { HomeData, HomeSideItem, HomeTrending } from '../source/leercapitulo';

const COVER_ASPECT_RATIO = 248 / 352;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [home, setHome] = useState<HomeData | null>(null);
  const [hasError, setHasError] = useState(false);
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
        setHasError(false);
      }
    } catch {
      if (requestId === requestRef.current) {
        setHasError(true);
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
        </View>
      </Screen>
    );
  }

  if (hasError && !home) {
    return (
      <Screen topInset={insets.top}>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            No se pudo cargar el inicio
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setLoading(true);
              setHasError(false);
              void request();
            }}
            className="mt-6 rounded-lg bg-zinc-900 px-5 py-2 dark:bg-zinc-100"
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
            Sin datos.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen topInset={insets.top}>
      <ScrollView
        contentContainerClassName="pb-2"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              setHasError(false);
              void request();
            }}
          />
        }
      >
        <Header hasError={hasError} />
        <HeroCarousel items={home.trending} />
        <SideRail title="Últimos mangas" items={home.latest} />
        <SideRail title="Populares" items={home.popular} />
        <View style={{ height: insets.bottom + 24 }} />
      </ScrollView>
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

function Header({ hasError }: { hasError: boolean }) {
  return (
    <View className="px-4 pb-6 pt-3">
      <Text className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        inkuru
      </Text>
      {hasError ? (
        <Text className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
          No se pudo actualizar.
        </Text>
      ) : null}
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <Text
      accessibilityRole="header"
      className="mb-3 px-4 text-base font-semibold text-zinc-900 dark:text-zinc-100"
    >
      {children}
    </Text>
  );
}

function HeroCarousel({ items }: { items: HomeTrending[] }) {
  const { width } = useWindowDimensions();
  const coverWidth = Math.min(Math.round(width * 0.5), 200);

  if (items.length === 0) {
    return null;
  }

  return (
    <View>
      <SectionTitle>Tendencias</SectionTitle>
      <FlatList
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        data={items}
        keyExtractor={(item) => item.path}
        renderItem={({ item, index }) => (
          <HeroSlide
            item={item}
            width={width}
            coverWidth={coverWidth}
            position={`${index + 1} / ${items.length}`}
          />
        )}
      />
    </View>
  );
}

function HeroSlide({
  item,
  width,
  coverWidth,
  position,
}: {
  item: HomeTrending;
  width: number;
  coverWidth: number;
  position: string;
}) {
  return (
    <View style={{ width }} className="px-4">
      <View className="flex-row items-center">
        <View
          className="overflow-hidden rounded-lg bg-zinc-200 dark:bg-zinc-800"
          style={{ width: coverWidth, aspectRatio: COVER_ASPECT_RATIO }}
        >
          <Image
            source={{ uri: item.cover }}
            className="h-full w-full"
            resizeMode="cover"
            accessible={false}
          />
        </View>
        <View className="ml-4 flex-1">
          <Text
            numberOfLines={3}
            className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
          >
            {item.title}
          </Text>
          {item.latestChapter ? (
            <Text
              numberOfLines={1}
              className="mt-2 text-sm text-zinc-500 dark:text-zinc-400"
            >
              {item.latestChapter.title}
            </Text>
          ) : null}
          <Text className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">
            {position}
          </Text>
        </View>
      </View>
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

function RailSeparator() {
  return <View className="w-3" />;
}
