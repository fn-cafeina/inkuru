import { useCallback, useEffect, useRef, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import {
  FlatList,
  Image,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation, useScrollToTop } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppPressable } from '../components/AppPressable';
import { ErrorState } from '../components/ErrorState';
import { LoadingState } from '../components/LoadingState';
import { Screen } from '../components/Screen';
import { useRemoteData } from '../hooks/useRemoteData';
import { fetchSearch } from '../source/leercapitulo';
import type { SearchItem } from '../source/leercapitulo';
import { TAB_BAR_SPACE, useTabBarVisibility } from '../navigation/tabBar';
import type { TabNavigation } from '../navigation/types';
import { useColors } from '../theme/colors';

const COVER_ASPECT_RATIO = 248 / 352;

export default function SearchScreen() {
  const colors = useColors();
  const navigation = useNavigation<TabNavigation<'Search'>>();
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
      <View className="px-4 py-3">
        <View className="min-h-12 flex-row items-center rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
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

      {term ? (
        <SearchResults
          key={term}
          term={term}
          onOpen={(path) => navigation.navigate('Manga', { path })}
        />
      ) : (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-sm text-zinc-500 dark:text-zinc-400">
            Escribe el título de un manga para empezar.
          </Text>
        </View>
      )}
    </Screen>
  );
}

function SearchResults({
  term,
  onOpen,
}: {
  term: string;
  onOpen: (path: string) => void;
}) {
  const fetcher = useCallback(
    (signal: AbortSignal) => fetchSearch(term, signal),
    [term],
  );
  const { data, hasError, loading, reload } = useRemoteData(fetcher);
  const insets = useSafeAreaInsets();
  const { onScroll } = useTabBarVisibility();
  const listRef = useRef<FlatList<SearchItem>>(null);
  useScrollToTop(listRef);

  if (loading && !data) {
    return <LoadingState />;
  }

  if (hasError && !data) {
    return <ErrorState message="No se pudo buscar" onRetry={reload} />;
  }

  if (!data || data.length === 0) {
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
      data={data}
      keyExtractor={(item) => item.path}
      renderItem={({ item }) => (
        <SearchRow item={item} onPress={() => onOpen(item.path)} />
      )}
      keyboardShouldPersistTaps="handled"
      onScroll={onScroll}
      scrollEventThrottle={16}
      ListFooterComponent={
        <View style={{ height: insets.bottom + TAB_BAR_SPACE }} />
      }
      contentContainerClassName="pb-2"
      showsVerticalScrollIndicator={false}
    />
  );
}

function SearchRow({
  item,
  onPress,
}: {
  item: SearchItem;
  onPress: () => void;
}) {
  return (
    <AppPressable
      accessibilityRole="button"
      accessibilityLabel={item.title}
      onPress={onPress}
      className="flex-row items-center px-4 py-3"
    >
      <Image
        source={{ uri: item.cover }}
        style={{ width: 56, aspectRatio: COVER_ASPECT_RATIO }}
        className="rounded-lg bg-zinc-200 dark:bg-zinc-800"
        resizeMode="cover"
        accessible={false}
      />
      <View className="ml-4 flex-1">
        <Text
          numberOfLines={2}
          className="text-sm font-medium text-zinc-900 dark:text-zinc-100"
        >
          {item.title}
        </Text>
        {item.lastChapter ? (
          <Text
            numberOfLines={1}
            className="mt-1 text-xs text-zinc-500 dark:text-zinc-400"
          >
            {item.lastChapter}
          </Text>
        ) : null}
      </View>
    </AppPressable>
  );
}
