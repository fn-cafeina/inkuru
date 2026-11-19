import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, useWindowDimensions, View } from 'react-native';
import {
  useFocusEffect,
  useRouter,
  useScrollToTop,
} from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { MangaGridCard } from '../../components/MangaGridCard';
import { MangaGridSkeleton } from '../../components/Skeleton';
import { SectionTitle } from '../../components/SectionTitle';
import { Screen } from '../../components/Screen';
import { useTabBarManager } from '../../hooks/useTabBarManager';
import { TAB_BAR_CLEARANCE } from '../../navigation/FloatingTabBar';
import { loadLibraryResult } from '../../storage/library';
import type { LibraryEntry } from '../../storage/library';
import { loadProgressMany } from '../../storage/readerProgress';
import type { ReaderProgress } from '../../storage/readerProgress';
import { CARD_GAP, mangaCardWidth } from '../../theme/gridLayout';
import { orderLibrary, sameEntries, sameProgress } from './orderLibrary';

let cachedEntries: LibraryEntry[] | null = null;
let cachedProgress: Record<string, ReaderProgress> = {};

export default function LibraryScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { handleScroll, reset } = useTabBarManager();
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
  const loadTicket = useRef(0);
  const cardWidth = mangaCardWidth(width);
  const visible = useMemo(
    () => orderLibrary(entries, progress),
    [entries, progress],
  );

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async (showSpinner = false) => {
    // A ticket guards against a slow refresh resolving after the user has
    // already removed an entry, which would resurrect it from stale data.
    const ticket = ++loadTicket.current;

    setFailed(false);

    if (showSpinner) {
      setLoaded(false);
    }

    const result = await loadLibraryResult();

    if (!mounted.current || ticket !== loadTicket.current) {
      return;
    }

    if (result.failed) {
      setFailed(true);
      setLoaded(true);
      return;
    }

    const loadedProgress = await loadProgressMany(
      result.entries.map((entry) => entry.path),
    );

    if (!mounted.current || ticket !== loadTicket.current) {
      return;
    }

    const sorted = [...result.entries].sort((a, b) => b.addedAt - a.addedAt);

    cachedEntries = sorted;
    cachedProgress = loadedProgress;
    setFailed(false);
    // A focus reload usually returns exactly what is already on screen; a new
    // array identity re-renders the whole grid for nothing.
    setEntries((current) => (sameEntries(current, sorted) ? current : sorted));
    setProgress((current) =>
      sameProgress(current, loadedProgress) ? current : loadedProgress,
    );
    setLoaded(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reset();
      void load();
    }, [load, reset]),
  );

  const retry = () => {
    void load(true);
  };
  const openManga = useCallback(
    (path: string, title: string) =>
      router.push({ pathname: '/manga', params: { path, title } }),
    [router],
  );

  return (
    <Screen>
      {entries.length > 0 ? (
        <View className="px-5 pt-4">
          <SectionTitle className="mb-3">Biblioteca</SectionTitle>
        </View>
      ) : null}

      {failed ? (
        <ErrorState
          message="No se pudo leer la biblioteca"
          onRetry={retry}
        />
      ) : !loaded ? (
        <MangaGridSkeleton cardWidth={cardWidth} />
      ) : entries.length === 0 ? (
        <EmptyState
          icon="bookmark"
          title="Biblioteca vacía"
          subtitle="Guarda un manga para retomarlo aquí."
        />
      ) : (
        <FlatList
          ref={listRef}
          data={visible}
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
          showsVerticalScrollIndicator={false}
        />
      )}
    </Screen>
  );
}
