import { useCallback, useRef, useState } from 'react';
import { FlatList, useWindowDimensions } from 'react-native';
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
import { MangaGridSkeleton } from '../components/Skeleton';
import type { TabNavigation } from '../navigation/types';
import { loadLibrary } from '../storage/library';
import type { LibraryEntry } from '../storage/library';
import { loadProgress } from '../storage/readerProgress';
import type { ReaderProgress } from '../storage/readerProgress';
import { CARD_GAP, mangaCardWidth } from '../theme/gridLayout';

export default function LibraryScreen() {
  const navigation = useNavigation<TabNavigation<'Library'>>();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<LibraryEntry>>(null);
  useScrollToTop(listRef);
  const [entries, setEntries] = useState<LibraryEntry[] | null>(null);
  const [progress, setProgress] = useState<Record<string, ReaderProgress>>({});
  const cardWidth = mangaCardWidth(width);

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

  return (
    <Screen>
      <PageTitle>Biblioteca</PageTitle>

      {!entries ? (
        <MangaGridSkeleton cardWidth={cardWidth} />
      ) : entries.length === 0 ? (
        <EmptyState
          title="Tu biblioteca está vacía"
          subtitle="Guarda mangas desde su detalle para tenerlos a mano."
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
          contentContainerClassName="px-4 pb-4"
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
