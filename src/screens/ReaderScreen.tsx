import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import {
  FlatList,
  Modal,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import type { ListViewToken } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import {
  activateKeepAwakeAsync,
  deactivateKeepAwake,
} from 'expo-keep-awake';
import { NavigationBar } from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppPressable } from '../components/AppPressable';
import {
  CHAPTER_ROW_HEIGHT,
  CHAPTER_ROW_STEP,
  ChapterRow,
} from '../components/ChapterRow';
import { ErrorState } from '../components/ErrorState';
import { ListDivider } from '../components/ListDivider';
import { OptionChip } from '../components/OptionChip';
import { ReaderPage } from '../components/ReaderPage';
import { ReaderTransition } from '../components/ReaderTransition';
import { ScreenHeader } from '../components/ScreenHeader';
import { SectionTitle } from '../components/SectionTitle';
import { Skeleton } from '../components/Skeleton';
import { useRemoteData } from '../hooks/useRemoteData';
import { markChapterRead, saveProgress } from '../storage/readerProgress';
import {
  DEFAULT_READER_MODE,
  DEFAULT_READER_QUALITY,
  DEFAULT_READER_SCALE,
  READER_MODE_OPTIONS,
  READER_QUALITY_OPTIONS,
  READER_SCALE_OPTIONS,
  loadKeepAwake,
  loadReaderMode,
  loadReaderQuality,
  loadReaderScale,
  saveReaderMode,
  saveReaderQuality,
  saveReaderScale,
} from '../storage/readerSettings';
import type {
  ReaderMode,
  ReaderQuality,
  ReaderScale,
} from '../storage/readerSettings';
import { fetchReader } from '../source/leercapitulo';
import type { MangaChapter, ReaderData } from '../source/leercapitulo';
import type { RootStackParamList } from '../navigation/types';
import { useColors } from '../theme/colors';
import { CARD, OUTLINE_CONTROL } from '../theme/styles';

const pageKey = (path: string) => `reader:page:${path}`;

// Keep the last reading preferences for the next mount (chapter switch) while
// AsyncStorage resolves.
let preferredMode: ReaderMode = DEFAULT_READER_MODE;
let preferredScale: ReaderScale = DEFAULT_READER_SCALE;
let preferredQuality: ReaderQuality = DEFAULT_READER_QUALITY;

type Props = NativeStackScreenProps<RootStackParamList, 'Reader'>;

export default function ReaderScreen({ navigation, route }: Props) {
  const { path, title, mangaPath } = route.params;
  const insets = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const viewHeight = viewport.height > 0 ? viewport.height : windowHeight;
  const viewWidth = viewport.width > 0 ? viewport.width : windowWidth;
  const [mode, setMode] = useState<ReaderMode>(preferredMode);
  const [scale, setScale] = useState<ReaderScale>(preferredScale);
  const [quality, setQuality] = useState<ReaderQuality>(preferredQuality);
  const [page, setPage] = useState(0);
  // Reading starts immersive; only an explicit center tap reveals the chrome.
  const [chromeVisible, setChromeVisible] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [keepAwake, setKeepAwake] = useState(true);
  const [restored, setRestored] = useState(false);
  const fetcher = useCallback(
    (signal: AbortSignal) => fetchReader(path, signal),
    [path],
  );
  const { data, hasError, loading, reload } = useRemoteData(
    fetcher,
    `reader:${path}`,
  );

  const selectMode = (next: ReaderMode) => {
    preferredMode = next;
    setMode(next);
    void saveReaderMode(next);
  };
  const selectScale = (next: ReaderScale) => {
    preferredScale = next;
    setScale(next);
    void saveReaderScale(next);
  };
  const selectQuality = (next: ReaderQuality) => {
    preferredQuality = next;
    setQuality(next);
    void saveReaderQuality(next);
  };
  const colors = useColors();
  const hideChrome = useCallback(() => {
    setChromeVisible(false);
    NavigationBar.setHidden(true);
  }, []);
  const toggleChrome = useCallback(
    () => setChromeVisible((visible) => !visible),
    [],
  );
  const openChapter = (chapter: MangaChapter) => {
    setPickerOpen(false);

    if (chapter.path === path) {
      return;
    }

    navigation.replace('Reader', {
      path: chapter.path,
      title: chapter.title,
      mangaPath,
    });
  };
  const total = data?.pages.length ?? 0;
  const safePage = total > 0 ? Math.min(page, total - 1) : page;

  useEffect(() => {
    let active = true;

    const restore = async () => {
      try {
        const [
          storedMode,
          storedScale,
          storedQuality,
          storedKeepAwake,
          storedPage,
        ] = await Promise.all([
          loadReaderMode(),
          loadReaderScale(),
          loadReaderQuality(),
          loadKeepAwake(),
          AsyncStorage.getItem(pageKey(path)),
        ]);

        if (!active) {
          return;
        }

        if (storedMode) {
          preferredMode = storedMode;
          setMode(storedMode);
        }

        if (storedScale) {
          preferredScale = storedScale;
          setScale(storedScale);
        }

        if (storedQuality) {
          preferredQuality = storedQuality;
          setQuality(storedQuality);
        }

        setKeepAwake(storedKeepAwake);

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

      // Reaching the last page is the honest "chapter finished" signal.
      if (total > 0 && safePage >= total - 1) {
        void markChapterRead(mangaPath, path);
      }
    }
  }, [data?.title, mangaPath, path, restored, safePage, title, total]);

  useEffect(() => {
    if (!keepAwake) {
      return;
    }

    void activateKeepAwakeAsync('reader');

    return () => {
      deactivateKeepAwake('reader');
    };
  }, [keepAwake]);

  // True immersive: hiding both bars resizes the window. Sync the visibility
  // with the chrome (with a grace period so taps don't fight the timer) and
  // hide the chrome again when the user goes back to reading.
  useEffect(() => {
    NavigationBar.setHidden(!chromeVisible);

    if (chromeVisible) {
      const timer = setTimeout(hideChrome, 3000);

      return () => clearTimeout(timer);
    }

    return undefined;
  }, [chromeVisible, hideChrome]);

  // Warm the adjacent pages so swipes do not wait on the network.
  useEffect(() => {
    if (!data) {
      return;
    }

    for (const index of [safePage - 1, safePage + 1, safePage + 2]) {
      if (index >= 0 && index < data.pages.length) {
        void Image.prefetch(data.pages[index]);
      }
    }
  }, [data, safePage]);

  return (
    // The reader fills the whole window behind both system bars.
    <View className="flex-1 bg-zinc-950">
      <StatusBar hidden={!chromeVisible} hideTransitionAnimation="fade" />
      <View
        className="flex-1"
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          setViewport((prev) =>
            prev.width === width && prev.height === height
              ? prev
              : { width, height },
          );
        }}
      >
        {loading && !data ? (
          <ReaderSkeleton height={viewHeight} />
        ) : hasError && !data ? (
          <ErrorState message="No se pudo cargar el capítulo" onRetry={reload} />
        ) : !data ? (
          <ReaderSkeleton height={viewHeight} />
        ) : (
          <>
            <ReaderPages
              data={data}
              mode={mode}
              scale={scale}
              quality={quality}
              page={safePage}
              width={viewWidth}
              height={viewHeight}
              bottomInset={insets.bottom}
              title={title}
              onPageChange={setPage}
              onToggleChrome={toggleChrome}
              onReadActivity={hideChrome}
              onOpenNext={openChapter}
              onOpenPrev={openChapter}
              onOpenPicker={() => setPickerOpen(true)}
            />
            {hasError ? (
              <View
                pointerEvents="box-none"
                className="absolute left-0 right-0 top-0 items-center"
                style={{ paddingTop: insets.top + (chromeVisible ? 64 : 8) }}
              >
                <AppPressable
                  accessibilityLabel="No se pudo actualizar. Reintentar"
                  onPress={reload}
                  className="min-h-10 flex-row items-center rounded-lg bg-zinc-900 px-3 dark:bg-zinc-100"
                >
                  <Feather
                    name="refresh-cw"
                    size={14}
                    color={colors.background}
                  />
                  <Text className="ml-2 text-xs text-white dark:text-zinc-900">
                    No se pudo actualizar. Reintentar
                  </Text>
                </AppPressable>
              </View>
            ) : null}
          </>
        )}

        {chromeVisible ? (
          <View
            className="absolute left-0 right-0 top-0 bg-zinc-950"
            style={{ paddingTop: insets.top }}
          >
            <ScreenHeader
              title={data?.mangaTitle ?? data?.title ?? title}
              subtitle={data?.mangaTitle ? data.title || title : undefined}
              onBack={() => navigation.goBack()}
              action={
                <View className="flex-row items-center">
                  {data?.prev ? (
                    <AppPressable
                      accessibilityLabel={`Capítulo anterior: ${data.prev.title}`}
                      onPress={() => {
                        const prev = data.prev;

                        if (prev) {
                          openChapter(prev);
                        }
                      }}
                      className={`mr-2 min-h-12 min-w-12 items-center justify-center rounded-lg ${OUTLINE_CONTROL}`}
                    >
                      <Feather name="skip-back" size={18} color={colors.text} />
                    </AppPressable>
                  ) : null}
                  <AppPressable
                    accessibilityLabel="Lista de capítulos"
                    onPress={() => setPickerOpen(true)}
                    className={`mr-2 min-h-12 min-w-12 items-center justify-center rounded-lg ${OUTLINE_CONTROL}`}
                  >
                    <Feather name="list" size={18} color={colors.text} />
                  </AppPressable>
                  {data?.next ? (
                    <AppPressable
                      accessibilityLabel={`Capítulo siguiente: ${data.next.title}`}
                      onPress={() => {
                        const next = data.next;

                        if (next) {
                          openChapter(next);
                        }
                      }}
                      className={`mr-2 min-h-12 min-w-12 items-center justify-center rounded-lg ${OUTLINE_CONTROL}`}
                    >
                      <Feather
                        name="skip-forward"
                        size={18}
                        color={colors.text}
                      />
                    </AppPressable>
                  ) : null}
                  <AppPressable
                    accessibilityLabel="Ajustes de lectura"
                    onPress={() => setSettingsOpen(true)}
                    className={`min-h-12 min-w-12 items-center justify-center rounded-lg ${OUTLINE_CONTROL}`}
                  >
                    <Feather name="settings" size={18} color={colors.text} />
                  </AppPressable>
                </View>
              }
            />
          </View>
        ) : null}

        {chromeVisible && data ? (
          <ReaderToolbar
            mode={mode}
            page={safePage}
            total={data.pages.length}
            bottomInset={insets.bottom}
            onSelectMode={selectMode}
          />
        ) : null}

        <ChapterPicker
          visible={pickerOpen}
          chapters={data?.chapters ?? []}
          current={data?.chapterIndex ?? -1}
          onClose={() => setPickerOpen(false)}
          onSelect={openChapter}
        />
        <ReaderSettingsSheet
          visible={settingsOpen}
          mode={mode}
          scale={scale}
          quality={quality}
          onClose={() => setSettingsOpen(false)}
          onSelectMode={selectMode}
          onSelectScale={selectScale}
          onSelectQuality={selectQuality}
        />
      </View>
    </View>
  );
}

function ReaderSkeleton({ height }: { height: number }) {
  return (
    <View className="flex-1" style={{ height }}>
      <Skeleton className="h-full w-full" />
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
        style={{ backgroundColor: colors.scrim }}
      >
        <AppPressable
          accessible={false}
          onPress={onClose}
          pressFeedback={false}
          className="absolute inset-0"
        />
        <View
          className="rounded-t-xl border-t border-zinc-800 bg-zinc-900"
          style={{ maxHeight: '70%' }}
        >
          <View className="flex-row items-center justify-between pr-4">
            <SectionTitle className="px-4 text-zinc-100">Capítulos</SectionTitle>
            <AppPressable
              accessibilityLabel="Cerrar"
              onPress={onClose}
              className="min-h-12 min-w-12 items-center justify-center rounded-lg"
            >
              <Feather name="x" size={20} color={colors.text} />
            </AppPressable>
          </View>
          <FlatList
            data={chapters}
            keyExtractor={(item) => item.path}
            ItemSeparatorComponent={ListDivider}
            // Rows are CHAPTER_ROW_HEIGHT plus a 1px divider (CHAPTER_ROW_STEP).
            getItemLayout={(_, index) => ({
              length: CHAPTER_ROW_HEIGHT,
              offset: CHAPTER_ROW_STEP * index,
              index,
            })}
            initialScrollIndex={
              chapters.length > 0
                ? Math.min(Math.max(current, 0), chapters.length - 1)
                : undefined
            }
            renderItem={({ item, index }) => (
              <ChapterRow
                title={item.title}
                state={index === current ? 'selected' : undefined}
                onPress={() => onSelect(item)}
              />
            )}
            contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          />
        </View>
      </View>
    </Modal>
  );
}

function ChipGroup<T extends string>({
  title,
  options,
  value,
  onSelect,
}: {
  title: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onSelect: (value: T) => void;
}) {
  return (
    <View>
      <SectionTitle>{title}</SectionTitle>
      <View className={`mt-2 flex-row flex-wrap gap-2 rounded-xl p-3 ${CARD}`}>
        {options.map((option) => (
          <OptionChip
            key={option.value}
            label={option.label}
            selected={value === option.value}
            onPress={() => onSelect(option.value)}
          />
        ))}
      </View>
    </View>
  );
}

function ReaderSettingsSheet({
  visible,
  mode,
  scale,
  quality,
  onClose,
  onSelectMode,
  onSelectScale,
  onSelectQuality,
}: {
  visible: boolean;
  mode: ReaderMode;
  scale: ReaderScale;
  quality: ReaderQuality;
  onClose: () => void;
  onSelectMode: (mode: ReaderMode) => void;
  onSelectScale: (scale: ReaderScale) => void;
  onSelectQuality: (quality: ReaderQuality) => void;
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
        style={{ backgroundColor: colors.scrim }}
      >
        <AppPressable
          accessible={false}
          onPress={onClose}
          pressFeedback={false}
          className="absolute inset-0"
        />
        <View
          className="rounded-t-xl border-t border-zinc-800 bg-zinc-900"
          style={{ maxHeight: '85%' }}
        >
          <View className="flex-row items-center justify-between pr-4">
            <SectionTitle className="px-4 text-zinc-100">
              Ajustes de lectura
            </SectionTitle>
            <AppPressable
              accessibilityLabel="Cerrar"
              onPress={onClose}
              className="min-h-12 min-w-12 items-center justify-center rounded-lg"
            >
              <Feather name="x" size={20} color={colors.text} />
            </AppPressable>
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
            contentContainerClassName="px-4 gap-4"
          >
            <ChipGroup
              title="Modo de lectura"
              options={READER_MODE_OPTIONS}
              value={mode}
              onSelect={onSelectMode}
            />
            <ChipGroup
              title="Ajuste de página"
              options={READER_SCALE_OPTIONS}
              value={scale}
              onSelect={onSelectScale}
            />
            <ChipGroup
              title="Calidad de imagen"
              options={READER_QUALITY_OPTIONS}
              value={quality}
              onSelect={onSelectQuality}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function ReaderPages({
  data,
  mode,
  scale,
  quality,
  page,
  width,
  height,
  bottomInset,
  title,
  onPageChange,
  onToggleChrome,
  onReadActivity,
  onOpenNext,
  onOpenPrev,
  onOpenPicker,
}: {
  data: ReaderData;
  mode: ReaderMode;
  scale: ReaderScale;
  quality: ReaderQuality;
  page: number;
  width: number;
  height: number;
  bottomInset: number;
  title: string;
  onPageChange: (page: number) => void;
  onToggleChrome: () => void;
  onReadActivity: () => void;
  onOpenNext: (chapter: MangaChapter) => void;
  onOpenPrev: (chapter: MangaChapter) => void;
  onOpenPicker: () => void;
}) {
  const footer = (
    <ReaderTransition
      currentTitle={data.title || title}
      next={data.next}
      prev={data.prev}
      width={width}
      height={height}
      bottomInset={bottomInset}
      onOpenNext={onOpenNext}
      onOpenPrev={onOpenPrev}
      onOpenPicker={onOpenPicker}
    />
  );

  return mode === 'webtoon' ? (
    <VerticalPages
      pages={data.pages}
      width={width}
      windowHeight={height}
      scale={scale}
      quality={quality}
      initialPage={page}
      onPageChange={onPageChange}
      onToggleChrome={onToggleChrome}
      onReadActivity={onReadActivity}
      footer={footer}
    />
  ) : (
    <PagedPages
      pages={data.pages}
      width={width}
      windowHeight={height}
      scale={scale}
      quality={quality}
      direction={mode === 'paged-ltr' ? 'ltr' : 'rtl'}
      initialPage={page}
      onPageChange={onPageChange}
      onToggleChrome={onToggleChrome}
      onReadActivity={onReadActivity}
      footer={footer}
    />
  );
}

function VerticalPages({
  pages,
  width,
  windowHeight,
  scale,
  quality,
  initialPage,
  onPageChange,
  onToggleChrome,
  onReadActivity,
  footer,
}: {
  pages: string[];
  width: number;
  windowHeight: number;
  scale: ReaderScale;
  quality: ReaderQuality;
  initialPage: number;
  onPageChange: (page: number) => void;
  onToggleChrome: () => void;
  onReadActivity: () => void;
  footer: ReactElement;
}) {
  const listRef = useRef<FlatList<string>>(null);
  const didRestore = useRef(false);
  const didRetry = useRef(false);
  const [zoomed, setZoomed] = useState(false);
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

  const goToPage = (index: number) => {
    if (index < 0 || index >= pages.length) {
      return;
    }

    listRef.current?.scrollToIndex({ index, animated: true });
  };

  return (
    <FlatList
      ref={listRef}
      data={pages}
      keyExtractor={(item) => item}
      onScrollBeginDrag={onReadActivity}
      onMomentumScrollBegin={onReadActivity}
      renderItem={({ item, index }) => (
        <ReaderPage
          uri={item}
          label={`Página ${index + 1}`}
          width={width}
          height={windowHeight}
          scaleMode={scale}
          quality={quality}
          paged={false}
          onTap={() => onToggleChrome()}
          onZoomChange={setZoomed}
          onNextPage={
            zoomed || index >= pages.length - 1
              ? undefined
              : () => goToPage(index + 1)
          }
          onPreviousPage={
            zoomed || index === 0 ? undefined : () => goToPage(index - 1)
          }
        />
      )}
      ListFooterComponent={footer}
      showsVerticalScrollIndicator={false}
      scrollEnabled={!zoomed}
      removeClippedSubviews={false}
      onScrollToIndexFailed={onScrollToIndexFailed}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfig}
      initialNumToRender={2}
      maxToRenderPerBatch={3}
      windowSize={5}
    />
  );
}

function PagedPages({
  pages,
  width,
  windowHeight,
  scale,
  quality,
  direction,
  initialPage,
  onPageChange,
  onToggleChrome,
  onReadActivity,
  footer,
}: {
  pages: string[];
  width: number;
  windowHeight: number;
  scale: ReaderScale;
  quality: ReaderQuality;
  direction: 'ltr' | 'rtl';
  initialPage: number;
  onPageChange: (page: number) => void;
  onToggleChrome: () => void;
  onReadActivity: () => void;
  footer: ReactElement;
}) {
  const listRef = useRef<FlatList<string>>(null);
  const didRestore = useRef(false);
  const [zoomed, setZoomed] = useState(false);
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

  // The stored page can land after mount; jump once it does.
  useEffect(() => {
    if (didRestore.current) {
      return;
    }

    didRestore.current = true;

    if (initialPage > 0 && initialPage < pages.length) {
      listRef.current?.scrollToIndex({ index: initialPage, animated: false });
    }
  }, [initialPage, pages.length]);

  const goToPage = (index: number) => {
    if (index < 0 || index >= pages.length) {
      return;
    }
    onReadActivity();
    listRef.current?.scrollToIndex({ index, animated: true });
  };

  // Taps are resolved from the touch coordinate the page reports, so the pinch
  // and the double tap keep working over the edge zones.
  const handlePageTap = (x: number, index: number) => {
    if (zoomed) {
      return;
    }

    // Outer thirds advance; only the center third touches the chrome, so a
    // page-advance tap never reveals the controls.
    const edge = width / 3;
    // In RTL the left edge advances, mirroring the inverted list.
    const advancesRight = direction === 'ltr';

    if (advancesRight) {
      if (x > width - edge) {
        goToPage(index + 1);
      } else if (x < edge) {
        goToPage(index - 1);
      } else {
        onToggleChrome();
      }

      return;
    }

    if (x < edge) {
      goToPage(index + 1);
    } else if (x > width - edge) {
      goToPage(index - 1);
    } else {
      onToggleChrome();
    }
  };

  return (
    <FlatList
      ref={listRef}
      horizontal
      inverted={direction === 'rtl'}
      pagingEnabled
      data={pages}
      keyExtractor={(item) => item}
      getItemLayout={(_, index) => ({
        length: width,
        offset: width * index,
        index,
      })}
      initialScrollIndex={
        pages.length > 0 ? Math.min(initialPage, pages.length - 1) : undefined
      }
      renderItem={({ item, index }) => (
        <ReaderPage
          uri={item}
          label={`Página ${index + 1}`}
          width={width}
          height={windowHeight}
          scaleMode={scale}
          quality={quality}
          paged
          onTap={(x) => handlePageTap(x, index)}
          onZoomChange={setZoomed}
          onNextPage={
            zoomed || index >= pages.length - 1
              ? undefined
              : () => goToPage(index + 1)
          }
          onPreviousPage={
            zoomed || index === 0 ? undefined : () => goToPage(index - 1)
          }
        />
      )}
      ListFooterComponent={
        <View style={{ width, height: windowHeight }} className="justify-center">
          {footer}
        </View>
      }
      scrollEnabled={!zoomed}
      removeClippedSubviews={false}
      showsHorizontalScrollIndicator={false}
      onScrollBeginDrag={onReadActivity}
      onMomentumScrollBegin={onReadActivity}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfig}
      initialNumToRender={1}
      maxToRenderPerBatch={3}
      windowSize={5}
    />
  );
}

function ReaderToolbar({
  mode,
  page,
  total,
  bottomInset,
  onSelectMode,
}: {
  mode: ReaderMode;
  page: number;
  total: number;
  bottomInset: number;
  onSelectMode: (mode: ReaderMode) => void;
}) {
  return (
    <View
      className="absolute left-4 right-4 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2"
      style={{ bottom: bottomInset + 12 }}
    >
      <Text
        accessible
        accessibilityRole="text"
        accessibilityLabel={`Página ${page + 1} de ${total}`}
        className="mb-2 text-center text-xs text-zinc-400"
      >
        {page + 1} / {total}
      </Text>
      <View className="flex-row gap-2">
        {READER_MODE_OPTIONS.map((option) => (
          <OptionChip
            key={option.value}
            label={option.label}
            selected={mode === option.value}
            onPress={() => onSelectMode(option.value)}
          />
        ))}
      </View>
    </View>
  );
}
