import { useCallback, useEffect, useRef, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useNavigation, useScrollToTop } from '@react-navigation/native';

import { AppPressable } from '../components/AppPressable';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { MangaGridCard } from '../components/MangaGridCard';
import { PageTitle } from '../components/PageTitle';
import { Screen } from '../components/Screen';
import { MangaGridSkeleton } from '../components/Skeleton';
import { useRemoteData } from '../hooks/useRemoteData';
import type { TabNavigation } from '../navigation/types';
import { fetchCatalog, fetchSearch } from '../source/leercapitulo';
import type { CatalogPage, MangaListItem } from '../source/leercapitulo';
import { useColors } from '../theme/colors';
import { CARD_GAP, mangaCardWidth } from '../theme/gridLayout';

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
      <PageTitle>Explorar</PageTitle>
      <View className="px-4 pb-3">
        <View className="min-h-12 flex-row items-center rounded-full bg-white px-1 dark:bg-zinc-900">
          <View className="pl-3 pr-1">
            <Feather name="search" size={18} color={colors.iconInactive} />
          </View>
          <TextInput
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => setTerm(input.trim())}
            accessibilityLabel="Buscar manga"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            placeholder="Título del manga"
            placeholderTextColor={colors.iconInactive}
            className="min-h-12 flex-1 px-1 text-sm text-zinc-900 dark:text-zinc-100"
          />
          {input ? (
            <AppPressable
              accessibilityLabel="Limpiar búsqueda"
              onPress={clear}
              hitSlop={8}
              className="min-h-12 min-w-12 items-center justify-center rounded-full"
            >
              <Feather name="x" size={16} color={colors.iconInactive} />
            </AppPressable>
          ) : null}
        </View>
      </View>

      <DiscoverResults term={term} onClear={clear} />
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

function DiscoverResults({
  term,
  onClear,
}: {
  term: string;
  onClear: () => void;
}) {
  const navigation = useNavigation<TabNavigation<'Discover'>>();
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
  const { data, hasError, loading, fetching, refreshing, reload, refresh } =
    useRemoteData(fetcher, `discover:${term}:${page}`);
  const [items, setItems] = useState<MangaListItem[]>(() => data?.items ?? []);
  const [hasMore, setHasMore] = useState(() => data?.hasMore ?? false);
  const [activeTerm, setActiveTerm] = useState(term);
  const appliedPage = useRef(data ? page : 0);
  const pendingPage = useRef<number | null>(null);
  const colors = useColors();
  const cardWidth = mangaCardWidth(width);

  // A term change resets pagination without remounting the list, so previous
  // results stay on screen until the first page of the new query arrives.
  if (activeTerm !== term) {
    setActiveTerm(term);
    setPage(1);
    setHasMore(false);
  }

  useEffect(() => {
    appliedPage.current = 0;
    pendingPage.current = null;
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [term]);

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

  if (items.length === 0) {
    if (loading) {
      return <MangaGridSkeleton cardWidth={cardWidth} />;
    }

    if (hasError) {
      return (
        <ErrorState
          message={
            term ? 'No se pudo buscar' : 'No se pudo cargar el catálogo'
          }
          onRetry={reload}
        />
      );
    }

    return (
      <EmptyState
        title={term ? `Sin resultados para «${term}»` : 'Catálogo vacío'}
        subtitle={
          term ? 'Prueba con otro término.' : 'No hay mangas para mostrar.'
        }
        action={
          <Button variant="secondary" onPress={term ? onClear : reload}>
            {term ? 'Ver catálogo' : 'Reintentar'}
          </Button>
        }
      />
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
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          colors={[colors.accent]}
          progressBackgroundColor={colors.surface}
        />
      }
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      ListFooterComponent={
        <View className="py-4">
          {hasError ? (
            <AppPressable
              accessibilityLabel="No se pudo cargar más. Reintentar"
              onPress={reload}
              className="min-h-12 flex-row items-center justify-center rounded-full border border-zinc-200 px-4 dark:border-zinc-800"
            >
              <Feather name="refresh-cw" size={16} color={colors.textMuted} />
              <Text className="ml-2 text-sm text-zinc-700 dark:text-zinc-300">
                No se pudo cargar más. Reintentar
              </Text>
            </AppPressable>
          ) : fetching && hasMore ? (
            <ActivityIndicator size="small" color={colors.iconInactive} />
          ) : null}
        </View>
      }
    />
  );
}
