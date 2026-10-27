import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import {
  FlatList,
  Image,
  Modal,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import type { ListViewToken } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useKeepAwake } from 'expo-keep-awake';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppPressable } from '../components/AppPressable';
import { ErrorState } from '../components/ErrorState';
import { ListDivider } from '../components/ListDivider';
import { LoadingState } from '../components/LoadingState';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { useRemoteData } from '../hooks/useRemoteData';
import { fetchReader } from '../source/leercapitulo';
import type { MangaChapter, ReaderData } from '../source/leercapitulo';
import type { RootStackParamList } from '../navigation/types';
import { useColors } from '../theme/colors';

// shortcut: observed pages are 1442x2100, used until the page reports its real size.
const PAGE_ASPECT_RATIO = 1442 / 2100;

type ReaderMode = 'vertical' | 'paged';

const MODE_KEY = 'reader:mode';
const pageKey = (path: string) => `reader:page:${path}`;

// Keeps the last mode for the next mount while AsyncStorage resolves.
let preferredMode: ReaderMode = 'vertical';

type Props = NativeStackScreenProps<RootStackParamList, 'Reader'>;

export default function ReaderScreen({ navigation, route }: Props) {
  const { path, title } = route.params;
  const insets = useSafeAreaInsets();
  useKeepAwake();
  const [mode, setMode] = useState<ReaderMode>(preferredMode);
  const [page, setPage] = useState(0);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [restored, setRestored] = useState(false);
  const fetcher = useCallback(
    (signal: AbortSignal) => fetchReader(path, signal),
    [path],
  );
  const { data, hasError, loading, reload } = useRemoteData(fetcher);

  const toggleMode = () => {
    const next = mode === 'vertical' ? 'paged' : 'vertical';
    preferredMode = next;
    setMode(next);
    void AsyncStorage.setItem(MODE_KEY, next);
  };
  const colors = useColors();
  const toggleChrome = () => setChromeVisible((visible) => !visible);
  const total = data?.pages.length ?? 0;
  const safePage = total > 0 ? Math.min(page, total - 1) : page;

  useEffect(() => {
    let active = true;

    const restore = async () => {
      try {
        const [storedMode, storedPage] = await Promise.all([
          AsyncStorage.getItem(MODE_KEY),
          AsyncStorage.getItem(pageKey(path)),
        ]);

        if (!active) {
          return;
        }

        if (storedMode === 'vertical' || storedMode === 'paged') {
          preferredMode = storedMode;
          setMode(storedMode);
        }

        const parsedPage = Number.parseInt(storedPage ?? '', 10);
        if (Number.isFinite(parsedPage) && parsedPage > 0) {
          setPage(parsedPage);
        }
      } catch {
        // A storage failure must not block reading.
      } finally {
        if (active) {
          setRestored(true);
        }
      }
    };

    void restore();

    return () => {
      active = false;
    };
  }, [path]);

  useEffect(() => {
    if (restored) {
      void AsyncStorage.setItem(pageKey(path), String(safePage));
    }
  }, [path, restored, safePage]);

  return (
    <Screen>
      <View className="flex-1">
        {loading && !data ? (
          <LoadingState />
        ) : hasError && !data ? (
          <ErrorState message="No se pudo cargar el capítulo" onRetry={reload} />
        ) : data && restored ? (
          <>
            <ReaderPages
              data={data}
              mode={mode}
              page={safePage}
              bottomInset={insets.bottom}
              onPageChange={setPage}
              onToggleChrome={toggleChrome}
              onOpen={(chapter) =>
                navigation.replace('Reader', {
                  path: chapter.path,
                  title: chapter.title,
                })
              }
            />
            <PageCounter
              page={safePage}
              total={data.pages.length}
              bottomInset={insets.bottom}
            />
          </>
        ) : (
          <LoadingState />
        )}

        {chromeVisible ? (
          <View className="absolute left-0 right-0 top-0 bg-zinc-50 dark:bg-zinc-950">
            <ScreenHeader
              title={data?.mangaTitle ?? data?.title ?? title}
              subtitle={data?.mangaTitle ? data.title || title : undefined}
              onBack={() => navigation.goBack()}
              action={
                <View className="flex-row items-center">
                  <AppPressable
                    accessibilityLabel="Lista de capítulos"
                    onPress={() => setPickerOpen(true)}
                    className="mr-2 min-h-12 min-w-12 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800"
                  >
                    <Feather name="list" size={18} color={colors.text} />
                  </AppPressable>
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
                </View>
              }
            />
          </View>
        ) : null}

        <ChapterPicker
          visible={pickerOpen}
          chapters={data?.chapters ?? []}
          current={data?.chapterIndex ?? -1}
          onClose={() => setPickerOpen(false)}
          onSelect={(chapter) => {
            setPickerOpen(false);
            if (chapter.path !== path) {
              navigation.replace('Reader', {
                path: chapter.path,
                title: chapter.title,
              });
            }
          }}
        />
      </View>
    </Screen>
  );
}

function ChapterPicker({
  visible,
  chapters,
  current,
  onClose,
  onSelect,
}: {
  visible: boolean;
  chapters: MangaChapter[];
  current: number;
  onClose: () => void;
  onSelect: (chapter: MangaChapter) => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View
        className="flex-1 justify-end"
        style={{ backgroundColor: 'rgba(9, 9, 11, 0.5)' }}
      >
        <AppPressable
          accessible={false}
          onPress={onClose}
          android_ripple={{ color: 'transparent' }}
          className="absolute inset-0"
        />
        <View
          className="rounded-t-2xl bg-zinc-50 dark:bg-zinc-950"
          style={{ maxHeight: '70%' }}
        >
          <View className="flex-row items-center justify-between px-4 py-2">
            <Text className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Capítulos
            </Text>
            <AppPressable
              accessibilityLabel="Cerrar"
              onPress={onClose}
              className="min-h-12 min-w-12 items-center justify-center rounded-full"
            >
              <Feather name="x" size={20} color={colors.text} />
            </AppPressable>
          </View>
          <FlatList
            data={chapters}
            keyExtractor={(item) => item.path}
            ItemSeparatorComponent={ListDivider}
            // shortcut: rows are min-h-12 plus a 1px divider, keep the layout in sync.
            getItemLayout={(_, index) => ({
              length: 49,
              offset: 49 * index,
              index,
            })}
            initialScrollIndex={
              chapters.length > 0
                ? Math.min(Math.max(current, 0), chapters.length - 1)
                : undefined
            }
            renderItem={({ item, index }) => (
              <AppPressable
                accessibilityLabel={item.title}
                accessibilityState={{ selected: index === current }}
                onPress={() => onSelect(item)}
                className="min-h-12 flex-row items-center justify-between px-4 py-3"
              >
                <Text
                  numberOfLines={1}
                  className={
                    index === current
                      ? 'flex-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100'
                      : 'flex-1 text-sm text-zinc-700 dark:text-zinc-300'
                  }
                >
                  {item.title}
                </Text>
                {index === current ? (
                  <Feather name="check" size={16} color={colors.text} />
                ) : null}
              </AppPressable>
            )}
            contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          />
        </View>
      </View>
    </Modal>
  );
}

function ReaderPages({
  data,
  mode,
  page,
  bottomInset,
  onPageChange,
  onToggleChrome,
  onOpen,
}: {
  data: ReaderData;
  mode: ReaderMode;
  page: number;
  bottomInset: number;
  onPageChange: (page: number) => void;
  onToggleChrome: () => void;
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
      page={page}
      initialPage={page}
      onPageChange={onPageChange}
      onToggleChrome={onToggleChrome}
      footer={chapterNav}
    />
  ) : (
    <VerticalPages
      pages={data.pages}
      width={width}
      initialPage={page}
      onPageChange={onPageChange}
      onToggleChrome={onToggleChrome}
      footer={chapterNav}
    />
  );
}

function VerticalPages({
  pages,
  width,
  initialPage,
  onPageChange,
  onToggleChrome,
  footer,
}: {
  pages: string[];
  width: number;
  initialPage: number;
  onPageChange: (page: number) => void;
  onToggleChrome: () => void;
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
        <PageImage
          uri={item}
          width={width}
          label={`Página ${index + 1}`}
          onPress={onToggleChrome}
        />
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
  page,
  initialPage,
  onPageChange,
  onToggleChrome,
  footer,
}: {
  pages: string[];
  width: number;
  page: number;
  initialPage: number;
  onPageChange: (page: number) => void;
  onToggleChrome: () => void;
  footer: ReactElement;
}) {
  const listRef = useRef<FlatList<string>>(null);
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

  const goToPage = (index: number) => {
    if (index < 0 || index >= pages.length) {
      return;
    }
    listRef.current?.scrollToIndex({ index, animated: true });
  };

  return (
    // Manga reads right to left, so page 1 sits on the right and the chapter end on the left.
    <FlatList
      ref={listRef}
      horizontal
      inverted
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
          <PageImage
            uri={item}
            paged
            label={`Página ${index + 1}`}
            onPress={onToggleChrome}
          />
          <AppPressable
            accessibilityLabel="Página siguiente"
            accessibilityState={{ disabled: page >= pages.length - 1 }}
            disabled={page >= pages.length - 1}
            onPress={() => goToPage(page + 1)}
            android_ripple={{ color: 'transparent' }}
            className="absolute bottom-0 left-0 top-0"
            style={{ width: width / 4 }}
          />
          <AppPressable
            accessibilityLabel="Página anterior"
            accessibilityState={{ disabled: page === 0 }}
            disabled={page === 0}
            onPress={() => goToPage(page - 1)}
            android_ripple={{ color: 'transparent' }}
            className="absolute bottom-0 right-0 top-0"
            style={{ width: width / 4 }}
          />
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
  onPress,
}: {
  uri: string;
  label: string;
  width?: number;
  paged?: boolean;
  onPress?: () => void;
}) {
  const [ratio, setRatio] = useState(PAGE_ASPECT_RATIO);
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <AppPressable
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
    <AppPressable
      accessible={false}
      onPress={onPress}
      disabled={!onPress}
      android_ripple={{ color: 'transparent' }}
      style={
        paged ? { width: '100%', height: '100%' } : { width, aspectRatio: ratio }
      }
      className="bg-zinc-200 dark:bg-zinc-800"
    >
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
        className="h-full w-full"
      />
    </AppPressable>
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
    <View className="px-4 pt-8" style={{ paddingBottom: bottomInset + 48 }}>
      <Text className="mb-3 text-center text-xs text-zinc-500 dark:text-zinc-400">
        Fin del capítulo
      </Text>
      <View className="flex-row">
        {prev ? (
          <AppPressable
            accessibilityLabel={prev.title}
            onPress={() => onOpen(prev)}
            className="mr-3 min-h-12 flex-1 items-center justify-center rounded-lg border border-zinc-200 px-3 dark:border-zinc-800"
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
            accessibilityLabel={next.title}
            onPress={() => onOpen(next)}
            className="min-h-12 flex-1 items-center justify-center rounded-lg border border-zinc-200 px-3 dark:border-zinc-800"
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
