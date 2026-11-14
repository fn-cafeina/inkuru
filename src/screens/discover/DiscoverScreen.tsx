import { useCallback, useEffect, useRef, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  useFocusEffect,
  useNavigation,
  useScrollToTop,
} from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { MangaGridCard } from '../../components/MangaGridCard';
import { PageTitle } from '../../components/PageTitle';
import { RefreshNotice } from '../../components/RefreshNotice';
import { Screen } from '../../components/Screen';
import { MangaGridSkeleton } from '../../components/Skeleton';
import { useTabBarManager } from '../../hooks/useTabBarManager';
import { TAB_BAR_CLEARANCE } from '../../navigation/FloatingTabBar';
import type { TabNavigation } from '../../navigation/types';
import type { MangaListItem } from '../../source/zonatmo';
import { useColors } from '../../theme/colors';
import { CARD_GAP, mangaCardWidth } from '../../theme/gridLayout';
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
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'android' ? 'height' : 'padding'}
      >
        <PageTitle>Explorar</PageTitle>
        <View className="px-5 pb-3">
          <View className="h-12 flex-row items-center rounded-xl border border-zinc-200 bg-white px-4 dark:border-neutral-800 dark:bg-neutral-900">
            <Feather
              name="search"
              size={18}
              color={colors.iconInactive}
              style={{ marginRight: 8 }}
            />
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
              className="h-12 flex-1 text-base text-zinc-900 dark:text-zinc-50"
            />
            {input ? (
              <Feather
                name="x"
                size={16}
                color={colors.iconInactive}
                accessibilityLabel="Limpiar búsqueda"
                onPress={clear}
                style={{ padding: 8 }}
              />
            ) : null}
          </View>
        </View>

        <DiscoverResults term={term} onClear={clear} />
      </KeyboardAvoidingView>
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

  // An empty catalog is not a failure, so there is nothing to retry; only a
  // failed request gets a retry button.
  return (
    <EmptyState
      title={term ? `Sin resultados para «${term}»` : 'Catálogo vacío'}
      subtitle={
        term ? 'Prueba con otro término.' : 'No hay mangas para mostrar.'
      }
      action={
        term ? (
          <Button variant="secondary" onPress={onClear}>
            Ver catálogo
          </Button>
        ) : undefined
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
  const { handleScroll, reset } = useTabBarManager();
  const insets = useSafeAreaInsets();
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
    reset();
  }, [term, reset]);

  useFocusEffect(
    useCallback(() => {
      reset();
    }, [reset]),
  );

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
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingBottom: insets.bottom + TAB_BAR_CLEARANCE,
      }}
      onScroll={handleScroll}
      scrollEventThrottle={16}
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
            <RefreshNotice message="No se pudo cargar más" onRetry={reload} className="" />
          ) : fetching && hasMore ? (
            <ActivityIndicator size="small" color={colors.iconInactive} />
          ) : null}
        </View>
      }
    />
  );
}
