import { useCallback, useEffect, useRef, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import {
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
  useRouter,
  useScrollToTop,
} from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { MangaGridCard } from '@/components/MangaGridCard';
import { Screen } from '@/components/Screen';
import { MangaGridSkeleton } from '@/components/Skeleton';
import { useTabBarManager } from '@/hooks/useTabBarManager';
import { TAB_BAR_CLEARANCE } from '@/navigation/FloatingTabBar';
import type { MangaListItem } from '@/source/zonatmo';
import { useColors } from '@/theme/colors';
import { CARD_GAP, mangaCardWidth } from '@/theme/gridLayout';
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
        <View className="px-5 pt-4 pb-3">
          <View className="h-12 flex-row items-center rounded-xl border border-neutral-800 bg-neutral-900 px-4">
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
              placeholder="Buscar manga"
              placeholderTextColor={colors.iconInactive}
              className="h-12 flex-1 text-base text-white"
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

        <DiscoverResults term={term} />
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
  onRetry,
}: {
  term: string;
  loading: boolean;
  fetching: boolean;
  hasError: boolean;
  cardWidth: number;
  onRetry: () => void;
}) {
  if (loading || fetching) {
    return <MangaGridSkeleton cardWidth={cardWidth} />;
  }

  if (hasError) {
    return (
      <View className="absolute inset-0" pointerEvents="box-none">
        <ErrorState
          message={term ? 'No se pudo buscar' : 'No se pudo cargar el catálogo'}
          onRetry={onRetry}
        />
      </View>
    );
  }

  // An empty catalog is not a failure, so there is nothing to retry; only a
  // failed request gets a retry button.
  // The overlay ignores the search bar, so these states center in the whole
  // content area like the library ones instead of sitting lower.
  return (
    <View className="absolute inset-0" pointerEvents="box-none">
      <EmptyState
        icon={term ? 'search' : 'book-open'}
        title={term ? `Sin resultados para «${term}»` : 'Catálogo vacío'}
        subtitle={
          term ? 'Prueba con otro término.' : 'No hay mangas para mostrar.'
        }
      />
    </View>
  );
}

function DiscoverResults({ term }: { term: string }) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<MangaListItem>>(null);
  useScrollToTop(listRef);
  const { handleScroll, reset } = useTabBarManager();
  const insets = useSafeAreaInsets();
  const {
    items,
    loading,
    fetching,
    hasError,
    refreshing,
    reload,
    refresh,
  } = useDiscoverFeed(term);
  const colors = useColors();
  const cardWidth = mangaCardWidth(width);
  // Filter failures are reported by the fallback, never as an empty grid.
  const showItems = items.length > 0;

  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
    reset();
  }, [term, reset]);

  useFocusEffect(
    useCallback(() => {
      reset();
    }, [reset]),
  );

  const openManga = useCallback(
    (path: string, title: string) =>
      router.push({ pathname: '/manga', params: { path, title } }),
    [router],
  );

  if (!showItems) {
    return (
      <DiscoverFallback
        term={term}
        loading={loading}
        fetching={fetching}
        hasError={hasError}
        cardWidth={cardWidth}
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
          path={item.path}
          title={item.title}
          cover={item.cover}
          width={cardWidth}
          onOpen={openManga}
        />
      )}
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
    />
  );
}
