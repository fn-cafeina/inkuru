import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import {
  FlatList,
  Image,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import type { ListViewToken } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppPressable } from '../components/AppPressable';
import { ErrorState } from '../components/ErrorState';
import { LoadingState } from '../components/LoadingState';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { useRemoteData } from '../hooks/useRemoteData';
import { fetchReader } from '../source/leercapitulo';
import type { MangaChapter, ReaderData } from '../source/leercapitulo';
import type { RootStackParamList } from '../navigation/types';

// shortcut: observed pages are 1442x2100, used until the page reports its real size.
const PAGE_ASPECT_RATIO = 1442 / 2100;

type ReaderMode = 'vertical' | 'paged';

// shortcut: mode lasts for the session only, persist it with AsyncStorage if it must survive restarts.
let preferredMode: ReaderMode = 'vertical';

type Props = NativeStackScreenProps<RootStackParamList, 'Reader'>;

export default function ReaderScreen({ navigation, route }: Props) {
  const { path, title } = route.params;
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<ReaderMode>(preferredMode);
  const [page, setPage] = useState(0);
  const fetcher = useCallback(
    (signal: AbortSignal) => fetchReader(path, signal),
    [path],
  );
  const { data, hasError, loading, reload } = useRemoteData(fetcher);

  const toggleMode = () => {
    const next = mode === 'vertical' ? 'paged' : 'vertical';
    preferredMode = next;
    setMode(next);
  };

  return (
    <Screen>
      <ScreenHeader
        title={data?.mangaTitle ?? data?.title ?? title}
        subtitle={data?.mangaTitle ? data.title || title : undefined}
        onBack={() => navigation.goBack()}
        action={
          <AppPressable
            accessibilityLabel={
              mode === 'vertical'
                ? 'Cambiar a modo páginas'
                : 'Cambiar a modo cascada'
            }
            onPress={toggleMode}
            className="min-h-12 justify-center rounded-lg border border-zinc-200 px-3 dark:border-zinc-800"
          >
            <Text className="text-xs text-zinc-700 dark:text-zinc-300">
              {mode === 'vertical' ? 'Páginas' : 'Cascada'}
            </Text>
          </AppPressable>
        }
      />

      {loading && !data ? (
        <LoadingState />
      ) : hasError && !data ? (
        <ErrorState message="No se pudo cargar el capítulo" onRetry={reload} />
      ) : data ? (
        <>
          <ReaderPages
            data={data}
            mode={mode}
            page={page}
            bottomInset={insets.bottom}
            onPageChange={setPage}
            onOpen={(chapter) =>
              navigation.replace('Reader', {
                path: chapter.path,
                title: chapter.title,
              })
            }
          />
          <PageCounter
            page={page}
            total={data.pages.length}
            bottomInset={insets.bottom}
          />
        </>
      ) : null}
    </Screen>
  );
}

function ReaderPages({
  data,
  mode,
  page,
  bottomInset,
  onPageChange,
  onOpen,
}: {
  data: ReaderData;
  mode: ReaderMode;
  page: number;
  bottomInset: number;
  onPageChange: (page: number) => void;
  onOpen: (chapter: MangaChapter) => void;
}) {
  const { width } = useWindowDimensions();
  const chapterNav = (
    <ChapterNav
      prev={data.prev}
      next={data.next}
      bottomInset={bottomInset}
      onOpen={onOpen}
    />
  );

  return mode === 'paged' ? (
    <PagedPages
      pages={data.pages}
      width={width}
      initialPage={page}
      onPageChange={onPageChange}
      footer={chapterNav}
    />
  ) : (
    <VerticalPages
      pages={data.pages}
      width={width}
      initialPage={page}
      onPageChange={onPageChange}
      footer={chapterNav}
    />
  );
}

function VerticalPages({
  pages,
  width,
  initialPage,
  onPageChange,
  footer,
}: {
  pages: string[];
  width: number;
  initialPage: number;
  onPageChange: (page: number) => void;
  footer: ReactElement;
}) {
  const listRef = useRef<FlatList<string>>(null);
  const didRestore = useRef(false);
  const didRetry = useRef(false);
  const [onViewableItemsChanged] = useState(
    () =>
      ({ viewableItems }: { viewableItems: ListViewToken[] }) => {
        const index = viewableItems[0]?.index;
        if (index != null) {
          onPageChange(index);
        }
      },
  );
  const [viewabilityConfig] = useState(() => ({
    itemVisiblePercentThreshold: 50,
  }));

  useEffect(() => {
    if (didRestore.current) {
      return;
    }
    didRestore.current = true;
    if (initialPage > 0 && initialPage < pages.length) {
      listRef.current?.scrollToIndex({ index: initialPage, animated: false });
    }
  }, [initialPage, pages.length]);

  const onScrollToIndexFailed = (info: {
    index: number;
    averageItemLength: number;
  }) => {
    if (didRetry.current) {
      return;
    }
    didRetry.current = true;
    listRef.current?.scrollToOffset({
      offset: info.averageItemLength * info.index,
      animated: false,
    });
    setTimeout(() => {
      listRef.current?.scrollToIndex({ index: info.index, animated: false });
    }, 120);
  };

  return (
    <FlatList
      ref={listRef}
      data={pages}
      keyExtractor={(item) => item}
      renderItem={({ item, index }) => (
        <PageImage uri={item} width={width} label={`Página ${index + 1}`} />
      )}
      ListFooterComponent={footer}
      showsVerticalScrollIndicator={false}
      onScrollToIndexFailed={onScrollToIndexFailed}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfig}
      initialNumToRender={3}
      maxToRenderPerBatch={3}
      windowSize={5}
    />
  );
}

function PagedPages({
  pages,
  width,
  initialPage,
  onPageChange,
  footer,
}: {
  pages: string[];
  width: number;
  initialPage: number;
  onPageChange: (page: number) => void;
  footer: ReactElement;
}) {
  const [onViewableItemsChanged] = useState(
    () =>
      ({ viewableItems }: { viewableItems: ListViewToken[] }) => {
        const index = viewableItems[0]?.index;
        if (index != null && index < pages.length) {
          onPageChange(index);
        }
      },
  );
  const [viewabilityConfig] = useState(() => ({
    itemVisiblePercentThreshold: 50,
  }));

  return (
    <FlatList
      horizontal
      pagingEnabled
      data={pages}
      keyExtractor={(item) => item}
      getItemLayout={(_, index) => ({
        length: width,
        offset: width * index,
        index,
      })}
      initialScrollIndex={Math.min(initialPage, pages.length - 1)}
      renderItem={({ item, index }) => (
        <View style={{ width }} className="justify-center">
          <PageImage uri={item} paged label={`Página ${index + 1}`} />
        </View>
      )}
      ListFooterComponent={
        <View style={{ width }} className="justify-center">
          {footer}
        </View>
      }
      showsHorizontalScrollIndicator={false}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfig}
      initialNumToRender={1}
      maxToRenderPerBatch={2}
      windowSize={3}
    />
  );
}

function PageImage({
  uri,
  label,
  width,
  paged = false,
}: {
  uri: string;
  label: string;
  width?: number;
  paged?: boolean;
}) {
  const [ratio, setRatio] = useState(PAGE_ASPECT_RATIO);
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <AppPressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, no se pudo cargar. Reintentar`}
        onPress={() => {
          setFailed(false);
          setAttempt((current) => current + 1);
        }}
        style={
          paged ? { width: '100%', height: '100%' } : { width, aspectRatio: ratio }
        }
        className="items-center justify-center bg-zinc-200 px-6 dark:bg-zinc-800"
      >
        <Text className="text-center text-xs text-zinc-600 dark:text-zinc-400">
          No se pudo cargar. Toca para reintentar.
        </Text>
      </AppPressable>
    );
  }

  return (
    <Image
      key={attempt}
      source={{ uri }}
      onLoad={(event) => {
        if (!paged) {
          const { width: sourceWidth, height: sourceHeight } =
            event.nativeEvent.source;
          setRatio(sourceWidth / sourceHeight);
        }
      }}
      onError={() => setFailed(true)}
      resizeMode="contain"
      accessibilityLabel={label}
      style={
        paged ? { width: '100%', height: '100%' } : { width, aspectRatio: ratio }
      }
      className="bg-zinc-200 dark:bg-zinc-800"
    />
  );
}

function ChapterNav({
  prev,
  next,
  bottomInset,
  onOpen,
}: {
  prev?: MangaChapter;
  next?: MangaChapter;
  bottomInset: number;
  onOpen: (chapter: MangaChapter) => void;
}) {
  return (
    <View
      className="flex-row px-4 pt-8"
      style={{ paddingBottom: bottomInset + 24 }}
    >
      {prev ? (
        <AppPressable
          accessibilityRole="button"
          accessibilityLabel={prev.title}
          onPress={() => onOpen(prev)}
          className="mr-3 flex-1 items-center justify-center rounded-lg border border-zinc-200 py-3 dark:border-zinc-800"
        >
          <Text
            numberOfLines={1}
            className="text-sm text-zinc-700 dark:text-zinc-300"
          >
            ‹ {prev.title}
          </Text>
        </AppPressable>
      ) : null}
      {next ? (
        <AppPressable
          accessibilityRole="button"
          accessibilityLabel={next.title}
          onPress={() => onOpen(next)}
          className="flex-1 items-center justify-center rounded-lg border border-zinc-200 py-3 dark:border-zinc-800"
        >
          <Text
            numberOfLines={1}
            className="text-sm text-zinc-700 dark:text-zinc-300"
          >
            {next.title} ›
          </Text>
        </AppPressable>
      ) : null}
    </View>
  );
}

function PageCounter({
  page,
  total,
  bottomInset,
}: {
  page: number;
  total: number;
  bottomInset: number;
}) {
  return (
    <View
      pointerEvents="none"
      style={{ bottom: bottomInset + 12 }}
      className="absolute right-4 rounded-full bg-zinc-900 px-3 py-1 dark:bg-zinc-100"
    >
      <Text className="text-xs text-white dark:text-zinc-900">
        {page + 1} / {total}
      </Text>
    </View>
  );
}
