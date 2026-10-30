import { useCallback, useEffect, useState } from 'react';
import { Text, useWindowDimensions, View } from 'react-native';
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

import { AppPressable } from '../../components/AppPressable';
import { ErrorState } from '../../components/ErrorState';
import { ScreenHeader } from '../../components/ScreenHeader';
import { ChapterPicker } from './components/ChapterPicker';
import { ReaderSettingsSheet } from './components/ReaderSettingsSheet';
import { ReaderSkeleton } from './components/ReaderSkeleton';
import { ReaderPages } from './pages/ReaderPages';
import { useRemoteData } from '../../hooks/useRemoteData';
import { markChapterRead, saveProgress } from '../../storage/readerProgress';
import {
  DEFAULT_READER_MODE,
  DEFAULT_READER_QUALITY,
  DEFAULT_READER_SCALE,
  loadKeepAwake,
  loadReaderMode,
  loadReaderQuality,
  loadReaderScale,
  saveReaderMode,
  saveReaderQuality,
  saveReaderScale,
} from '../../storage/readerSettings';
import type {
  ReaderMode,
  ReaderQuality,
  ReaderScale,
} from '../../storage/readerSettings';
import { fetchReader } from '../../source/leercapitulo';
import type { MangaChapter } from '../../source/leercapitulo';
import type { RootStackParamList } from '../../navigation/types';
import { useColors } from '../../theme/colors';
import { OUTLINE_CONTROL } from '../../theme/styles';

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
  // Reading opens with the chrome visible; a center tap toggles it.
  const [chromeVisible, setChromeVisible] = useState(true);
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
  const headerSubtitle = data
    ? [
        data.mangaTitle ? data.title || title : undefined,
        total > 0 ? `${safePage + 1}/${total}` : undefined,
      ]
        .filter(Boolean)
        .join(' · ')
    : undefined;

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
      <StatusBar hidden />
      <NavigationBar hidden />
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
              subtitle={headerSubtitle}
              onBack={() => navigation.goBack()}
              action={
                <View className="flex-row items-center">
                  <AppPressable
                    accessibilityLabel="Lista de capítulos"
                    onPress={() => setPickerOpen(true)}
                    className={`mr-2 min-h-12 min-w-12 items-center justify-center rounded-lg ${OUTLINE_CONTROL}`}
                  >
                    <Feather name="list" size={18} color={colors.text} />
                  </AppPressable>
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

