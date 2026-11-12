import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  useFocusEffect,
  useNavigation,
  useScrollToTop,
} from '@react-navigation/native';

import { AppPressable } from '../../components/AppPressable';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { MangaGridCard } from '../../components/MangaGridCard';
import { PageTitle } from '../../components/PageTitle';
import { Screen } from '../../components/Screen';
import type { TabNavigation } from '../../navigation/types';
import { loadLibraryResult, removeFromLibrary } from '../../storage/library';
import type { LibraryEntry } from '../../storage/library';
import { loadProgressMany } from '../../storage/readerProgress';
import type { ReaderProgress } from '../../storage/readerProgress';
import { useColors } from '../../theme/colors';
import { CARD_GAP, mangaCardWidth } from '../../theme/gridLayout';
import { matchesQuery, orderLibrary } from './orderLibrary';

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
  const [checking, setChecking] = useState(true);
  const [failed, setFailed] = useState(false);
  // Removing from a 3-column grid: long press alone is undiscoverable, and a
  // delete button under every card is noise. One toggle reveals them all.
  const [editing, setEditing] = useState(false);
  const mounted = useRef(true);
  const loadTicket = useRef(0);
  const cardWidth = mangaCardWidth(width);
  const [query, setQuery] = useState('');
  const visible = useMemo(() => {
    const ordered = orderLibrary(entries, progress);

    return query.trim() ? ordered.filter((item) => matchesQuery(item.title, query)) : ordered;
  }, [entries, progress, query]);

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

    setChecking(true);
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
      setChecking(false);
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
    setEntries(sorted);
    setProgress(loadedProgress);
    setLoaded(true);
    setChecking(false);
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

            // Invalidate any in-flight load so it cannot restore the entry.
            loadTicket.current += 1;
            // The invalidated load returns without clearing the flag.
            setChecking(false);

            const next = entries.filter((item) => item.path !== entry.path);
            const nextProgress = { ...progress };

            delete nextProgress[entry.path];
            cachedEntries = next;
            cachedProgress = nextProgress;
            setEntries(next);
            setProgress(nextProgress);
          });
        },
      },
    ]);
  };

  return (
    <Screen>
      <PageTitle
        action={
          entries.length > 0 && !failed ? (
            <AppPressable
              accessibilityLabel={
                editing ? 'Terminar de editar' : 'Editar biblioteca'
              }
              accessibilityState={{ selected: editing }}
              onPress={() => setEditing((value) => !value)}
              hitSlop={8}
              className="min-h-12 min-w-12 items-center justify-center rounded-full"
            >
              <Feather
                name={editing ? 'check' : 'edit-2'}
                size={18}
                color={editing ? colors.accent : colors.iconInactive}
              />
            </AppPressable>
          ) : undefined
        }
      >
        Biblioteca
      </PageTitle>

      {entries.length > 4 ? (
        <LibrarySearch query={query} onChange={setQuery} />
      ) : null}

      {failed ? (
        <ErrorState
          message="No se pudo leer la biblioteca"
          onRetry={retry}
        />
      ) : !loaded || (checking && entries.length === 0) ? (
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
          data={visible}
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
              onRemove={editing ? () => confirmRemove(item) : undefined}
            />
          )}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              title={`Sin resultados para «${query}»`}
              subtitle="Prueba con otro título."
              action={
                <Button variant="secondary" onPress={() => setQuery('')}>
                  Ver biblioteca
                </Button>
              }
            />
          }
        />
      )}
    </Screen>
  );
}

/** Only worth the row once the grid is longer than a screen or two. */
function LibrarySearch({
  query,
  onChange,
}: {
  query: string;
  onChange: (query: string) => void;
}) {
  const colors = useColors();

  return (
    <View className="mb-3 px-4">
      <View className="min-h-12 flex-row items-center rounded-full bg-white px-1 dark:bg-zinc-900">
        <View className="pl-3 pr-1">
          <Feather name="search" size={18} color={colors.iconInactive} />
        </View>
        <TextInput
          value={query}
          onChangeText={onChange}
          accessibilityLabel="Buscar en la biblioteca"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          placeholder="Buscar en la biblioteca"
          placeholderTextColor={colors.iconInactive}
          className="min-h-12 flex-1 px-1 text-sm text-zinc-900 dark:text-zinc-100"
        />
        {query ? (
          <AppPressable
            accessibilityLabel="Limpiar búsqueda"
            onPress={() => onChange('')}
            hitSlop={8}
            className="min-h-12 min-w-12 items-center justify-center rounded-full"
          >
            <Feather name="x" size={16} color={colors.iconInactive} />
          </AppPressable>
        ) : null}
      </View>
    </View>
  );
}
