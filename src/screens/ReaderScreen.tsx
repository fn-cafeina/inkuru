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
import { StatusBar } from 'expo-status-bar';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppPressable } from '../components/AppPressable';
import { ErrorState } from '../components/ErrorState';
import { ListDivider } from '../components/ListDivider';
import { LoadingState } from '../components/LoadingState';
import { ScreenHeader } from '../components/ScreenHeader';
import { SectionTitle } from '../components/SectionTitle';
import { Skeleton } from '../components/Skeleton';
import { useRemoteData } from '../hooks/useRemoteData';
import { saveProgress } from '../storage/readerProgress';
import { loadReaderMode, saveReaderMode } from '../storage/readerSettings';
import type { ReaderMode } from '../storage/readerSettings';
import { fetchReader } from '../source/leercapitulo';
import type { MangaChapter, ReaderData } from '../source/leercapitulo';
import type { RootStackParamList } from '../navigation/types';
import { useColors } from '../theme/colors';

// shortcut: observed pages are 1442x2100, used until the page reports its real size.
const PAGE_ASPECT_RATIO = 1442 / 2100;

const pageKey = (path: string) => `reader:page:${path}`;

// Keeps the last mode for the next mount while AsyncStorage resolves.
let preferredMode: ReaderMode = 'vertical';

type Props = NativeStackScreenProps<RootStackParamList, 'Reader'>;

export default function ReaderScreen({ navigation, route }: Props) {
  const { path, title, mangaPath } = route.params;
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
  const { data, hasError, loading, reload } = useRemoteData(
    fetcher,
    `reader:${path}`,
  );

  const toggleMode = () => {
    const next = mode === 'vertical' ? 'paged' : 'vertical';
    preferredMode = next;
    setMode(next);
    void saveReaderMode(next);
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
          loadReaderMode(),
          AsyncStorage.getItem(pageKey(path)),
        ]);

        if (!active) {
          return;
        }

        if (storedMode) {
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
    if (!restored) {
      return;
    }

    void AsyncStorage.setItem(pageKey(path), String(safePage));

    if (mangaPath) {
      void saveProgress(mangaPath, {
        chapterPath: path,
        chapterTitle: data?.title || title,
        page: safePage,
      });
    }
  }, [data?.title, mangaPath, path, restored, safePage, title]);

  return (
    // The reader owns the top inset so pages reach the status bar when the chrome is hidden.
    <View className="flex-1 bg-zinc-50 dark:bg-zinc-950">
      <StatusBar hidden={!chromeVisible} />
      <View className="flex-1">
        {loading && !data ? (
          <ReaderSkeleton />
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
          <View
            className="absolute left-0 right-0 top-0 bg-zinc-50 dark:bg-zinc-950"
            style={{ paddingTop: insets.top }}
          >
            <ScreenHeader
              title={data?.mangaTitle ?? data?.title ?? title}
              subtitle={data?.mangaTitle ? data.title || title : undefined}
              onBack={() => navigation.goBack()}
              action={
                <View className="flex-row items-center">
                  <AppPressable
                    accessibilityLabel="Lista de capítulos"
                    onPress={() => setPickerOpen(true)}
                    className="mr-2 min-h-12 min-w-12 items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-800"
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
                    className="min-h-12 justify-center rounded-xl border border-zinc-200 px-3 dark:border-zinc-800"
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
                mangaPath,
              });
            }
          }}
        />
      </View>
    </View>
  );
}

function ReaderSkeleton() {
  const { width } = useWindowDimensions();

  return (
    <View>
      {[0, 1, 2].map((index) => (
        <Skeleton
          key={index}
          className="mb-2 rounded"
          style={{ width, aspectRatio: PAGE_ASPECT_RATIO }}
        />
      ))}
    </View>
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
          <View className="flex-row items-center justify-between pr-4">
            <SectionTitle className="px-4">Capítulos</SectionTitle>
            <AppPressable
              accessibilityLabel="Cerrar"
              onPress={onClose}
              borderlessRipple
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
                  <Feather name="check" size={16} color={colors.accent} />
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
}: {
  data: ReaderData;
  mode: ReaderMode;
  page: number;
  bottomInset: number;
  onPageChange: (page: number) => void;
  onToggleChrome: () => void;
}) {
  const { width } = useWindowDimensions();
  // Keeps the last page clear of the screen edge after ChapterNav was removed.
  const footer = <View style={{ paddingBottom: bottomInset + 24 }} />;

  return mode === 'paged' ? (
    <PagedPages
      pages={data.pages}
      width={width}
      page={page}
      initialPage={page}
      onPageChange={onPageChange}
      onToggleChrome={onToggleChrome}
      footer={footer}
    />
  ) : (
    <VerticalPages
      pages={data.pages}
      width={width}
      initialPage={page}
      onPageChange={onPageChange}
      onToggleChrome={onToggleChrome}
      footer={footer}
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
  const [zoomed, setZoomed] = useState(false);
  const ratioValue = useSharedValue(PAGE_ASPECT_RATIO);
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  const settle = () => {
    'worklet';
    savedScale.value = scale.value;

    if (scale.value <= 1.05) {
      scale.value = withTiming(1);
      translateX.value = withTiming(0);
      translateY.value = withTiming(0);
      savedScale.value = 1;
      savedX.value = 0;
      savedY.value = 0;
      runOnJS(setZoomed)(false);
    } else {
      runOnJS(setZoomed)(true);
    }
  };

  const pinch = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = Math.min(
        4,
        Math.max(1, savedScale.value * event.scale),
      );
    })
    .onEnd(settle);

  const pan = Gesture.Pan()
    .enabled(zoomed)
    .onUpdate((event) => {
      const max = ((scale.value - 1) * (width ?? 0)) / 2;
      const maxY = max / ratioValue.value;
      translateX.value = Math.min(
        max,
        Math.max(-max, savedX.value + event.translationX),
      );
      translateY.value = Math.min(
        maxY,
        Math.max(-maxY, savedY.value + event.translationY),
      );
    })
    .onEnd(() => {
      'worklet';
      savedX.value = translateX.value;
      savedY.value = translateY.value;
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

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

  const image = (
    <Image
      key={attempt}
      source={{ uri }}
      resizeMethod="resize"
      onLoad={(event) => {
        if (!paged) {
          const { width: sourceWidth, height: sourceHeight } =
            event.nativeEvent.source;
          ratioValue.value = sourceWidth / sourceHeight;
          setRatio(sourceWidth / sourceHeight);
        }
      }}
      onError={() => setFailed(true)}
      resizeMode="contain"
      accessibilityLabel={label}
      className="h-full w-full"
    />
  );

  // shortcut: zoom anchors to page center, not the pinch focal point; add focal
  // transform if pinch tracking feels off. Paged mode has no zoom (blocks paging).
  if (paged) {
    return (
      <AppPressable
        accessible={false}
        onPress={onPress}
        disabled={!onPress}
        android_ripple={{ color: 'transparent' }}
        style={{ width: '100%', height: '100%' }}
        className="bg-zinc-200 dark:bg-zinc-800"
      >
        {image}
      </AppPressable>
    );
  }

  return (
    <GestureDetector gesture={Gesture.Simultaneous(pinch, pan)}>
      <Animated.View style={[{ width, aspectRatio: ratio }, animatedStyle]}>
        <AppPressable
          accessible={false}
          onPress={onPress}
          disabled={!onPress}
          android_ripple={{ color: 'transparent' }}
          style={{ width, aspectRatio: ratio }}
          className="bg-zinc-200 dark:bg-zinc-800"
        >
          {image}
        </AppPressable>
      </Animated.View>
    </GestureDetector>
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
