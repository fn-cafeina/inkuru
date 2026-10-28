import { useCallback, useEffect, useRef, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import {
  ActivityIndicator,
  FlatList,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useNavigation, useScrollToTop } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppPressable } from '../components/AppPressable';
import { ErrorState } from '../components/ErrorState';
import { MangaGridCard } from '../components/MangaGridCard';
import { Screen } from '../components/Screen';
import { MangaGridSkeleton } from '../components/Skeleton';
import { useRemoteData } from '../hooks/useRemoteData';
import { TAB_BAR_SPACE, useTabBarVisibility } from '../navigation/tabBar';
import type { TabNavigation } from '../navigation/types';
import { fetchCatalog, fetchSearch } from '../source/leercapitulo';
import type { CatalogPage, MangaListItem } from '../source/leercapitulo';
import { useColors } from '../theme/colors';

const CARD_GAP = 12;

export default function DiscoverScreen() {
  const colors = useColors();
  const [input, setInput] = useState('');
  const [term, setTerm] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setTerm(input.trim()), 300);

    return () => clearTimeout(timer);
  }, [input]);

  const clear = () => {
    setInput('');
    setTerm('');
  };

  return (
    <Screen>
      <View className="px-4 pb-3 pt-3">
        <Text className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Explorar
        </Text>
        <View className="mt-3 min-h-12 flex-row items-center rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <TextInput
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => setTerm(input.trim())}
            accessibilityLabel="Buscar manga"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            placeholder="Buscar manga..."
            placeholderTextColor={colors.iconInactive}
            className="min-h-12 flex-1 px-3 text-sm text-zinc-900 dark:text-zinc-100"
          />
          {input ? (
            <AppPressable
              accessibilityLabel="Limpiar búsqueda"
              onPress={clear}
              hitSlop={8}
              className="min-h-12 items-center justify-center rounded-lg px-3"
            >
              <Feather name="x" size={16} color={colors.iconInactive} />
            </AppPressable>
          ) : null}
        </View>
      </View>

      <DiscoverResults key={term} term={term} />
    </Screen>
  );
}

function mergeItems(current: MangaListItem[], next: MangaListItem[]) {
  const merged = [...current];
  const seen = new Set(current.map((item) => item.path));

  for (const item of next) {
    if (!seen.has(item.path)) {
      seen.add(item.path);
      merged.push(item);
    }
  }

  return merged;
}

function DiscoverResults({ term }: { term: string }) {
  const navigation = useNavigation<TabNavigation<'Discover'>>();
  const insets = useSafeAreaInsets();
  const { onScroll } = useTabBarVisibility();
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(1);
  const listRef = useRef<FlatList<MangaListItem>>(null);
  useScrollToTop(listRef);
  const fetcher = useCallback(
    async (signal: AbortSignal): Promise<CatalogPage> => {
      if (term) {
        return { items: await fetchSearch(term, signal), hasMore: false };
      }

      return fetchCatalog(page, signal);
    },
    [page, term],
  );
  const { data, hasError, loading, fetching, reload } = useRemoteData(
    fetcher,
    `discover:${term}:${page}`,
  );
  const [items, setItems] = useState<MangaListItem[]>(() => data?.items ?? []);
  const [hasMore, setHasMore] = useState(() => data?.hasMore ?? false);
  const appliedPage = useRef(data ? page : 0);
  const pendingPage = useRef<number | null>(null);
  const colors = useColors();
  const cardWidth = Math.floor((width - 32 - CARD_GAP * 2) / 3);

  // Mirroring fetched pages into the accumulated list is the external-system
  // sync this effect exists for; the set-state-in-effect heuristic cannot tell
  // it apart from a cascading render.
  /* eslint-disable react-hooks/set-state-in-effect -- accumulate fetched pages */
  useEffect(() => {
    if (!data) {
      return;
    }

    if (page === 1) {
      appliedPage.current = 1;
      setItems(data.items);
      setHasMore(data.hasMore);

      if (!data.hasMore) {
        pendingPage.current = null;
      }

      return;
    }

    if (appliedPage.current === page) {
      if (pendingPage.current === page) {
        pendingPage.current = null;
      }

      return;
    }

    appliedPage.current = page;
    setItems((current) => mergeItems(current, data.items));
    setHasMore(data.hasMore);

    if (pendingPage.current === page || !data.hasMore) {
      pendingPage.current = null;
    }
  }, [data, page]);

  // A page requested while the current request was in flight resumes here, so
  // a short list does not lose the onEndReached that fired during revalidation.
  useEffect(() => {
    const pending = pendingPage.current;

    if (fetching || hasError || !hasMore || pending === null || pending === page) {
      return;
    }

    setPage(pending);
  }, [fetching, hasError, hasMore, page]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const openManga = (item: MangaListItem) =>
    navigation.navigate('Manga', { path: item.path, title: item.title });

  const loadMore = () => {
    if (
      hasError ||
      !hasMore ||
      pendingPage.current !== null ||
      items.length === 0
    ) {
      return;
    }

    // Assigned synchronously, so two onEndReached in one frame advance once.
    pendingPage.current = page + 1;

    if (!fetching) {
      setPage(pendingPage.current);
    }
  };

  if (loading && items.length === 0) {
    return <MangaGridSkeleton cardWidth={cardWidth} />;
  }

  if (hasError && items.length === 0) {
    return (
      <ErrorState message="No se pudo cargar el catálogo" onRetry={reload} />
    );
  }

  if (items.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Sin resultados.
        </Text>
        <Text className="mt-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
          Prueba con otro título o revisa la ortografía.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      ref={listRef}
      data={items}
      keyExtractor={(item) => item.path}
      numColumns={3}
      columnWrapperStyle={{ gap: CARD_GAP }}
      contentContainerClassName="px-4 pb-2"
      renderItem={({ item }) => (
        <MangaGridCard
          title={item.title}
          cover={item.cover}
          subtitle={item.lastChapter}
          width={cardWidth}
          onPress={() => openManga(item)}
        />
      )}
      onScroll={onScroll}
      scrollEventThrottle={16}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      ListFooterComponent={
        <View
          style={{
            paddingTop: 16,
            paddingBottom: insets.bottom + TAB_BAR_SPACE,
          }}
        >
          {hasError ? (
            <AppPressable
              accessibilityLabel="No se pudo cargar más. Reintentar"
              onPress={reload}
              className="min-h-12 flex-row items-center justify-center rounded-lg border border-zinc-200 px-4 dark:border-zinc-800"
            >
              <Feather name="refresh-cw" size={16} color={colors.textMuted} />
              <Text className="ml-2 text-sm text-zinc-700 dark:text-zinc-300">
                No se pudo cargar más. Reintentar
              </Text>
            </AppPressable>
          ) : fetching ? (
            <ActivityIndicator size="small" color={colors.iconInactive} />
          ) : null}
        </View>
      }
    />
  );
}
