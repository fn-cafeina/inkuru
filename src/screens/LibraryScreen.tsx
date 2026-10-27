import { useCallback, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  useFocusEffect,
  useNavigation,
  useScrollToTop,
} from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppPressable } from '../components/AppPressable';
import { LoadingState } from '../components/LoadingState';
import { MangaGridCard } from '../components/MangaGridCard';
import { Screen } from '../components/Screen';
import { TAB_BAR_SPACE, useTabBarVisibility } from '../navigation/tabBar';
import type { TabNavigation } from '../navigation/types';
import { loadLibrary, removeFromLibrary } from '../storage/library';
import type { LibraryEntry } from '../storage/library';
import { loadProgress } from '../storage/readerProgress';
import type { ReaderProgress } from '../storage/readerProgress';

const CARD_GAP = 12;

export default function LibraryScreen() {
  const navigation = useNavigation<TabNavigation<'Library'>>();
  const insets = useSafeAreaInsets();
  const { onScroll } = useTabBarVisibility();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<LibraryEntry>>(null);
  useScrollToTop(listRef);
  const [entries, setEntries] = useState<LibraryEntry[] | null>(null);
  const [progress, setProgress] = useState<Record<string, ReaderProgress>>({});
  const cardWidth = Math.floor((width - 32 - CARD_GAP * 2) / 3);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      void (async () => {
        const items = await loadLibrary();
        const loaded: Record<string, ReaderProgress> = {};

        await Promise.all(
          items.map(async (entry) => {
            const value = await loadProgress(entry.path);

            if (value) {
              loaded[entry.path] = value;
            }
          }),
        );

        if (!active) {
          return;
        }

        setEntries([...items].sort((a, b) => b.addedAt - a.addedAt));
        setProgress(loaded);
      })();

      return () => {
        active = false;
      };
    }, []),
  );

  const removeEntry = async (path: string) => {
    const ok = await removeFromLibrary(path);

    if (!ok) {
      Alert.alert('No se pudo actualizar la biblioteca');
      return;
    }

    setEntries((current) =>
      current ? current.filter((entry) => entry.path !== path) : current,
    );
  };

  const confirmRemove = (entry: LibraryEntry) => {
    Alert.alert('Quitar de la biblioteca', entry.title, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar',
        style: 'destructive',
        onPress: () => {
          void removeEntry(entry.path);
        },
      },
    ]);
  };

  return (
    <Screen>
      <View className="px-4 pb-4 pt-3">
        <Text className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Biblioteca
        </Text>
      </View>

      {!entries ? (
        <LoadingState />
      ) : entries.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Tu biblioteca está vacía
          </Text>
          <Text className="mt-2 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Guarda mangas desde su detalle para tenerlos a mano.
          </Text>
          <AppPressable
            onPress={() => navigation.navigate('Discover')}
            className="mt-6 min-h-12 items-center justify-center rounded-lg bg-zinc-900 px-5 dark:bg-zinc-100"
          >
            <Text className="text-sm font-semibold text-white dark:text-zinc-900">
              Explorar catálogo
            </Text>
          </AppPressable>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={entries}
          keyExtractor={(item) => item.path}
          numColumns={3}
          columnWrapperStyle={{ gap: CARD_GAP }}
          contentContainerClassName="px-4 pb-2"
          renderItem={({ item }) => (
            <MangaGridCard
              title={item.title}
              cover={item.cover}
              subtitle={progress[item.path]?.chapterTitle ?? 'Sin empezar'}
              width={cardWidth}
              onPress={() =>
                navigation.navigate('Manga', {
                  path: item.path,
                  title: item.title,
                })
              }
              onLongPress={() => confirmRemove(item)}
              accessibilityHint="Mantén pulsado para quitar de la biblioteca"
            />
          )}
          onScroll={onScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            <View style={{ height: insets.bottom + TAB_BAR_SPACE }} />
          }
        />
      )}
    </Screen>
  );
}
