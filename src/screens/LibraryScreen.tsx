import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { ErrorState } from '../components/ErrorState';
import { MangaGridCard } from '../components/MangaGridCard';
import { PageTitle } from '../components/PageTitle';
import { Screen } from '../components/Screen';
import type { TabNavigation } from '../navigation/types';
import { loadLibraryResult, removeFromLibrary } from '../storage/library';
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
  const [failed, setFailed] = useState(false);
  const mounted = useRef(true);
  const cardWidth = mangaCardWidth(width);

  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) {
      setFailed(false);
      setLoaded(false);
    }

    const result = await loadLibraryResult();

    if (!mounted.current) {
      return;
    }

    if (result.failed) {
      setFailed(true);
      setLoaded(true);
      return;
    }

    const loadedProgress: Record<string, ReaderProgress> = {};

    await Promise.all(
      result.entries.map(async (entry) => {
        const value = await loadProgress(entry.path);

        if (value) {
          loadedProgress[entry.path] = value;
        }
      }),
    );

    if (!mounted.current) {
      return;
    }

    const sorted = [...result.entries].sort((a, b) => b.addedAt - a.addedAt);

    cachedEntries = sorted;
    cachedProgress = loadedProgress;
    setFailed(false);
    setEntries(sorted);
    setProgress(loadedProgress);
    setLoaded(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const retry = () => {
    void load(true);
  };

  const confirmRemove = (entry: LibraryEntry) => {
    Alert.alert('Quitar de la biblioteca', entry.title, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar',
        style: 'destructive',
        onPress: () => {
          void removeFromLibrary(entry.path).then((ok) => {
            if (!ok) {
              Alert.alert('No se pudo quitar', 'Inténtalo de nuevo.');
              return;
            }

            const next = entries.filter((item) => item.path !== entry.path);

            cachedEntries = next;
            setEntries(next);
            setProgress((current) => {
              const nextProgress = { ...current };

              delete nextProgress[entry.path];
              cachedProgress = nextProgress;

              return nextProgress;
            });
          });
        },
      },
    ]);
  };

  return (
    <Screen>
      <PageTitle>Biblioteca</PageTitle>

      {failed ? (
        <ErrorState
          message="No se pudo leer la biblioteca"
          onRetry={retry}
        />
      ) : !loaded ? (
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
              subtitle={progress[item.path]?.chapterTitle ?? 'Sin leer'}
              width={cardWidth}
              onPress={() =>
                navigation.navigate('Manga', {
                  path: item.path,
                  title: item.title,
                })
              }
              onLongPress={() => confirmRemove(item)}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </Screen>
  );
}
