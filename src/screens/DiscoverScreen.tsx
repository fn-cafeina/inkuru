import { useCallback, useEffect, useRef, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { FlatList, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useNavigation, useScrollToTop } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppPressable } from '../components/AppPressable';
import { ErrorState } from '../components/ErrorState';
import { LoadingState } from '../components/LoadingState';
import { MangaGridCard } from '../components/MangaGridCard';
import { Screen } from '../components/Screen';
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
              className="min-h-12 items-center justify-center px-3"
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
  const { data, hasError, loading, reload } = useRemoteData(
    fetcher,
    `discover:${term}:${page}`,
  );
  const cardWidth = Math.floor((width - 32 - CARD_GAP * 2) / 3);

  const openManga = (item: MangaListItem) =>
    navigation.navigate('Manga', { path: item.path, title: item.title });

  const changePage = (next: number) => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
    setPage(next);
  };

  if (loading && !data) {
    return <LoadingState />;
  }

  if (hasError && !data) {
    return (
      <ErrorState message="No se pudo cargar el catálogo" onRetry={reload} />
    );
  }

  if (!data) {
    return null;
  }

  if (data.items.length === 0) {
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
      data={data.items}
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
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      ListFooterComponent={
        <View style={{ paddingBottom: insets.bottom + TAB_BAR_SPACE }}>
          {term ? null : (
            <View className="mt-2 flex-row gap-3">
              <PageButton
                label="Anterior"
                disabled={page === 1}
                onPress={() => changePage(page - 1)}
              />
              <PageButton
                label="Siguiente"
                disabled={!data.hasMore}
                onPress={() => changePage(page + 1)}
              />
            </View>
          )}
        </View>
      }
    />
  );
}

function PageButton({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <AppPressable
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={
        disabled
          ? 'min-h-12 flex-1 items-center justify-center rounded-lg border border-zinc-200 opacity-40 dark:border-zinc-800'
          : 'min-h-12 flex-1 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800'
      }
    >
      <Text className="text-sm text-zinc-700 dark:text-zinc-300">{label}</Text>
    </AppPressable>
  );
}
