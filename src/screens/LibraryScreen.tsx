import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  useFocusEffect,
  useNavigation,
  useScrollToTop,
} from '@react-navigation/native';

import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { MangaGridCard } from '../components/MangaGridCard';
import { PageTitle } from '../components/PageTitle';
import { Screen } from '../components/Screen';
import type { TabNavigation } from '../navigation/types';
import { loadLibrary } from '../storage/library';
import type { LibraryEntry } from '../storage/library';
import { loadProgress } from '../storage/readerProgress';
import type { ReaderProgress } from '../storage/readerProgress';
import { useColors } from '../theme/colors';
import { CARD_GAP, mangaCardWidth } from '../theme/gridLayout';

let cachedEntries: LibraryEntry[] | null = null;
let cachedProgress: Record<string, ReaderProgress> = {};

export default function LibraryScreen() {
  const navigation = useNavigation<TabNavigation<'Library'>>();
  const colors = useColors();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<LibraryEntry>>(null);
  useScrollToTop(listRef);
  const [entries, setEntries] = useState<LibraryEntry[]>(
    () => cachedEntries ?? [],
  );
  const [progress, setProgress] =
    useState<Record<string, ReaderProgress>>(cachedProgress);
  const [loaded, setLoaded] = useState(cachedEntries !== null);
  const cardWidth = mangaCardWidth(width);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      void (async () => {
        const items = await loadLibrary();
        const loadedProgress: Record<string, ReaderProgress> = {};

        await Promise.all(
          items.map(async (entry) => {
            const value = await loadProgress(entry.path);

            if (value) {
              loadedProgress[entry.path] = value;
            }
          }),
        );

        if (!active) {
          return;
        }

        const sorted = [...items].sort((a, b) => b.addedAt - a.addedAt);

        cachedEntries = sorted;
        cachedProgress = loadedProgress;
        setEntries(sorted);
        setProgress(loadedProgress);
        setLoaded(true);
      })();

      return () => {
        active = false;
      };
    }, []),
  );

  return (
    <Screen>
      <PageTitle>Biblioteca</PageTitle>

      {!loaded ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.iconInactive} />
        </View>
      ) : entries.length === 0 ? (
        <EmptyState
          title="Biblioteca vacía"
          subtitle="Guarda un manga para retomarlo aquí."
          action={
            <Button
              variant="primary"
              onPress={() => navigation.navigate('Discover')}
            >
              Explorar catálogo
            </Button>
          }
        />
      ) : (
        <FlatList
          ref={listRef}
          data={entries}
          keyExtractor={(item) => item.path}
          numColumns={3}
          columnWrapperStyle={{ gap: CARD_GAP }}
          contentContainerClassName="px-4 pb-6"
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
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </Screen>
  );
}
