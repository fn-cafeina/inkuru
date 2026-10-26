import { useNavigation } from '@react-navigation/native';
import {
  ActivityIndicator,
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
import { Screen } from '../components/Screen';
import { SectionTitle } from '../components/SectionTitle';
import { useRemoteData } from '../hooks/useRemoteData';
import { TAB_BAR_SPACE, useTabBarVisibility } from '../navigation/tabBar';
import type { TabNavigation } from '../navigation/types';
import { fetchHome } from '../source/leercapitulo';
import type { HomeSideItem, HomeTrending } from '../source/leercapitulo';

const COVER_ASPECT_RATIO = 248 / 352;

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
  const openManga = (path: string) => navigation.navigate('Manga', { path });

  if (loading && !home) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#71717a" />
        </View>
      </Screen>
    );
  }

  if (hasError && !home) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            No se pudo cargar el inicio
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
      </Screen>
    );
  }

  if (!home) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-sm text-zinc-500 dark:text-zinc-400">
            Sin datos.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
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
        <SideRail title="Últimos mangas" items={home.latest} onPress={openManga} />
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
            onPress={onPress}
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
  onPress,
}: {
  item: HomeTrending;
  width: number;
  coverWidth: number;
  position: string;
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
          <Text className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">
            {position}
          </Text>
        </View>
      </View>
    </AppPressable>
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
    </AppPressable>
  );
}

function RailSeparator() {
  return <View className="w-3" />;
}
