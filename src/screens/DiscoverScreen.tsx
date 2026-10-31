import { useEffect, useRef, useState } from 'react';
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
import type { TabNavigation } from '../navigation/types';
import type { MangaListItem } from '../source/zonatmo';
import { useColors } from '../theme/colors';
import { CARD_GAP, mangaCardWidth } from '../theme/gridLayout';
import { useDiscoverFeed } from './useDiscoverFeed';

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

function DiscoverFallback({
  term,
  loading,
  fetching,
  hasError,
  cardWidth,
  onClear,
  onRetry,
}: {
  term: string;
  loading: boolean;
  fetching: boolean;
  hasError: boolean;
  cardWidth: number;
  onClear: () => void;
  onRetry: () => void;
}) {
  if (loading || fetching) {
    return <MangaGridSkeleton cardWidth={cardWidth} />;
  }

  if (hasError) {
    return (
      <ErrorState
        message={term ? 'No se pudo buscar' : 'No se pudo cargar el catálogo'}
        onRetry={onRetry}
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
        <Button variant="secondary" onPress={term ? onClear : onRetry}>
          {term ? 'Ver catálogo' : 'Reintentar'}
        </Button>
      }
    />
  );
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
  const listRef = useRef<FlatList<MangaListItem>>(null);
  useScrollToTop(listRef);
  const {
    items,
    itemsTerm,
    hasMore,
    loading,
    fetching,
    hasError,
    refreshing,
    reload,
    refresh,
    loadMore,
  } = useDiscoverFeed(term);
  const colors = useColors();
  const cardWidth = mangaCardWidth(width);
  // Keep the previous results visible while the next term loads, but never
  // present them as the result of a query that already failed.
  const showItems = items.length > 0 && (itemsTerm === term || fetching);

  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [term]);

  const openManga = (item: MangaListItem) =>
    navigation.navigate('Manga', { path: item.path, title: item.title });

  if (!showItems) {
    return (
      <DiscoverFallback
        term={term}
        loading={loading}
        fetching={fetching}
        hasError={hasError}
        cardWidth={cardWidth}
        onClear={onClear}
        onRetry={reload}
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
