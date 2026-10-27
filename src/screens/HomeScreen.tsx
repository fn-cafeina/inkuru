import { useNavigation, useScrollToTop } from '@react-navigation/native';
import { useRef, useState } from 'react';
import type { ListViewToken, ScrollViewInstance } from 'react-native';
import {
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppPressable } from '../components/AppPressable';
import { ErrorState } from '../components/ErrorState';
import { LoadingState } from '../components/LoadingState';
import { Screen } from '../components/Screen';
import { SectionTitle } from '../components/SectionTitle';
import { useRemoteData } from '../hooks/useRemoteData';
import { TAB_BAR_SPACE, useTabBarVisibility } from '../navigation/tabBar';
import type { TabNavigation } from '../navigation/types';
import { fetchHome } from '../source/leercapitulo';
import { COVER_ASPECT_RATIO } from '../theme/layout';
import type { HomeRelease, HomeSideItem, HomeTrending } from '../source/leercapitulo';

const MAX_UPDATES = 8;

type HomeUpdate = {
  mangaTitle: string;
  mangaPath: string;
  cover: string;
  chapterTitle: string;
  chapterPath: string;
};

function buildUpdates(releases: HomeRelease[]): HomeUpdate[] {
  const updates: HomeUpdate[] = [];

  for (const release of releases) {
    const chapter = release.chapters[0];
    if (chapter) {
      updates.push({
        mangaTitle: release.title,
        mangaPath: release.path,
        cover: release.cover,
        chapterTitle: chapter.title,
        chapterPath: chapter.path,
      });
    }
    if (updates.length >= MAX_UPDATES) {
      break;
    }
  }

  return updates;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const {
    data: home,
    hasError,
    loading,
    refreshing,
    reload,
    refresh,
  } = useRemoteData(fetchHome);
  const navigation = useNavigation<TabNavigation<'Home'>>();
  const { onScroll } = useTabBarVisibility();
  const scrollRef = useRef<ScrollViewInstance>(null);
  useScrollToTop(scrollRef);
  const openManga = (path: string) => navigation.navigate('Manga', { path });

  if (loading && !home) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  if (hasError && !home) {
    return (
      <Screen>
        <ErrorState message="No se pudo cargar el inicio" onRetry={reload} />
      </Screen>
    );
  }

  if (!home) {
    return null;
  }

  return (
    <Screen>
      <ScrollView
        ref={scrollRef}
        contentContainerClassName="pb-2"
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
      >
        <Header hasError={hasError} />
        <HeroCarousel items={home.trending} onPress={openManga} />
        <Updates
          items={buildUpdates(home.releases)}
          onPress={(update) =>
            navigation.navigate('Reader', {
              path: update.chapterPath,
              title: update.chapterTitle,
            })
          }
        />
        <SideRail title="Populares" items={home.popular} onPress={openManga} />
        <View style={{ height: insets.bottom + TAB_BAR_SPACE }} />
      </ScrollView>
    </Screen>
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

function HeroCarousel({
  items,
  onPress,
}: {
  items: HomeTrending[];
  onPress: (path: string) => void;
}) {
  const { width } = useWindowDimensions();
  const coverWidth = Math.min(Math.round(width * 0.5), 200);
  const [active, setActive] = useState(0);
  const [onViewableItemsChanged] = useState(
    () =>
      ({ viewableItems }: { viewableItems: ListViewToken[] }) => {
        const index = viewableItems[0]?.index;
        if (index != null) {
          setActive(index);
        }
      },
  );
  const [viewabilityConfig] = useState(() => ({
    itemVisiblePercentThreshold: 50,
  }));

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
        renderItem={({ item }) => (
          <HeroSlide
            item={item}
            width={width}
            coverWidth={coverWidth}
            onPress={onPress}
          />
        )}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
      />
      {items.length > 1 ? (
        <View
          className="mt-3 flex-row justify-center gap-1.5"
          accessible
          accessibilityLabel={`Tendencias, ${active + 1} de ${items.length}`}
        >
          {items.map((item, index) => (
            <View
              key={item.path}
              className={
                index === active
                  ? 'h-1.5 w-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100'
                  : 'h-1.5 w-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700'
              }
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function HeroSlide({
  item,
  width,
  coverWidth,
  onPress,
}: {
  item: HomeTrending;
  width: number;
  coverWidth: number;
  onPress: (path: string) => void;
}) {
  return (
    <AppPressable
      accessibilityRole="button"
      accessibilityLabel={item.title}
      onPress={() => onPress(item.path)}
      style={{ width }}
      className="px-4"
    >
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
        </View>
      </View>
    </AppPressable>
  );
}

function Updates({
  items,
  onPress,
}: {
  items: HomeUpdate[];
  onPress: (update: HomeUpdate) => void;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <View className="mt-8">
      <SectionTitle>Actualizaciones</SectionTitle>
      <View className="px-4">
        {items.map((item, index) => (
          <View key={item.chapterPath}>
            {index > 0 ? (
              <View className="h-px bg-zinc-200 dark:bg-zinc-800" />
            ) : null}
            <AppPressable
              accessibilityLabel={`${item.mangaTitle}, ${item.chapterTitle}`}
              onPress={() => onPress(item)}
              className="min-h-12 flex-row items-center py-2"
            >
              <Image
                source={{ uri: item.cover }}
                style={{ width: 32, aspectRatio: COVER_ASPECT_RATIO }}
                className="rounded-md bg-zinc-200 dark:bg-zinc-800"
                resizeMode="cover"
                accessible={false}
              />
              <View className="ml-3 flex-1">
                <Text
                  numberOfLines={1}
                  className="text-xs text-zinc-500 dark:text-zinc-400"
                >
                  {item.mangaTitle}
                </Text>
                <Text
                  numberOfLines={1}
                  className="mt-0.5 text-sm font-medium text-zinc-900 dark:text-zinc-100"
                >
                  {item.chapterTitle}
                </Text>
              </View>
            </AppPressable>
          </View>
        ))}
      </View>
    </View>
  );
}

function SideRail({
  title,
  items,
  onPress,
}: {
  title: string;
  items: HomeSideItem[];
  onPress: (path: string) => void;
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
        renderItem={({ item }) => <SideCard item={item} onPress={onPress} />}
        ItemSeparatorComponent={RailSeparator}
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="px-4"
      />
    </View>
  );
}

function SideCard({
  item,
  onPress,
}: {
  item: HomeSideItem;
  onPress: (path: string) => void;
}) {
  return (
    <AppPressable
      accessibilityRole="button"
      accessibilityLabel={item.title}
      onPress={() => onPress(item.path)}
      className="w-24"
    >
      <Image
        source={{ uri: item.cover }}
        style={{ width: 96, aspectRatio: COVER_ASPECT_RATIO }}
        className="rounded-lg bg-zinc-200 dark:bg-zinc-800"
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
    </AppPressable>
  );
}

function RailSeparator() {
  return <View className="w-3" />;
}
