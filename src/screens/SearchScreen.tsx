import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Screen } from '../components/Screen';
import { useRemoteData } from '../hooks/useRemoteData';
import { fetchSearch } from '../source/leercapitulo';
import type { SearchItem } from '../source/leercapitulo';
import type { RootStackParamList } from '../navigation/types';

const COVER_ASPECT_RATIO = 248 / 352;

type Props = NativeStackScreenProps<RootStackParamList, 'Search'>;

export default function SearchScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [input, setInput] = useState('');
  const [term, setTerm] = useState('');
  const submit = () => setTerm(input.trim());

  return (
    <Screen>
      <View className="flex-row items-center px-4 py-3">
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
        >
          <Text className="text-sm text-zinc-500 dark:text-zinc-400">Volver</Text>
        </Pressable>
        <TextInput
          value={input}
          onChangeText={setInput}
          onSubmitEditing={submit}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          placeholder="Buscar manga..."
          placeholderTextColor="#71717a"
          className="ml-4 flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
        />
      </View>

      {term ? (
        <SearchResults
          key={term}
          term={term}
          bottomInset={insets.bottom}
          onOpen={(path) => navigation.navigate('Manga', { path })}
        />
      ) : (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-sm text-zinc-500 dark:text-zinc-400">
            Busca por título.
          </Text>
        </View>
      )}
    </Screen>
  );
}

function SearchResults({
  term,
  bottomInset,
  onOpen,
}: {
  term: string;
  bottomInset: number;
  onOpen: (path: string) => void;
}) {
  const fetcher = useCallback(
    (signal: AbortSignal) => fetchSearch(term, signal),
    [term],
  );
  const { data, hasError, loading, reload } = useRemoteData(fetcher);

  if (loading && !data) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#71717a" />
      </View>
    );
  }

  if (hasError && !data) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          No se pudo buscar
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={reload}
          className="mt-6 rounded-lg bg-zinc-900 px-5 py-2 dark:bg-zinc-100"
        >
          <Text className="text-sm font-semibold text-white dark:text-zinc-900">
            Reintentar
          </Text>
        </Pressable>
      </View>
    );
  }

  if (!data || data.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-sm text-zinc-500 dark:text-zinc-400">
          Sin resultados.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.path}
      renderItem={({ item }) => (
        <SearchRow item={item} onPress={() => onOpen(item.path)} />
      )}
      keyboardShouldPersistTaps="handled"
      ListFooterComponent={<View style={{ height: bottomInset + 24 }} />}
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
    <Pressable
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
    </Pressable>
  );
}
