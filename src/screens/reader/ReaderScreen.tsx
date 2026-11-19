import { useCallback, useEffect, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { NavigationBar } from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorState } from '@/components/ErrorState';
import { ChapterPicker } from './components/ChapterPicker';
import { ReaderChrome } from './components/ReaderChrome';
import { ReaderProgressBar } from './components/ReaderProgressBar';
import { ReaderSettingsSheet } from './components/ReaderSettingsSheet';
import { ReaderSkeleton } from './components/ReaderSkeleton';
import { ReaderPages } from './pages/ReaderPages';
import { prefetchChapter } from './prefetchChapter';
import { useRemoteData } from '@/hooks/useRemoteData';
import { useOpenLog } from '@/hooks/useOpenLog';
import type { Fields } from '@/dev/log';
import { useReaderPreferences } from './useReaderPreferences';
import { useReaderBack } from './useReaderBack';
import { useReaderProgress } from './useReaderProgress';
import { readerCacheKey } from '@/storage/cacheKeys';
import { loadReadChapters } from '@/storage/readerProgress';
import { ascendingChapters } from '@/screens/manga/chapters';
import { loadDownloadedReader } from '@/downloads/manager';
import { useIsChapterDownloaded } from '@/hooks/useDownloads';
import { isReaderData } from '@/source/guards';
import { fetchReader } from '@/source/zonatmo';
import type { MangaChapter, ReaderData } from '@/source/zonatmo';
import { CACHE_FRESH_MS } from '@/storage/queryCache';
import { goBackOrTabs } from '@/navigation/back';
import { reader } from '@/theme/colors';

function readerTitle(data: ReaderData | null, fallback: string): string {
  return data?.mangaTitle ?? data?.title ?? fallback;
}

function readerSubtitle(
  data: ReaderData | null,
  title: string,
): string | undefined {
  return data?.mangaTitle ? data.title || title : undefined;
}

function sheetAccessibility(pickerOpen: boolean, settingsOpen: boolean) {
  const open = pickerOpen || settingsOpen;

  return open ? 'no-hide-descendants' : 'auto';
}

/** Where the reader's payload came from, for the open line. */
function readerOpenFields(
  data: ReaderData | null,
  downloaded: boolean,
): Fields | null {
  if (data === null) {
    return null;
  }

  return {
    pages: data.pages.length,
    from: downloaded ? 'download' : 'network',
  };
}

type ReaderParams = { path: string; title: string; mangaPath?: string };

export default function ReaderScreen() {
  const {
    path: initialPath,
    title: initialTitle,
    mangaPath,
  } = useLocalSearchParams<ReaderParams>();
  const router = useRouter();
  const [chapterPath, setChapterPath] = useState(initialPath);
  const [chapterTitle, setChapterTitle] = useState(initialTitle);
  const insets = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const viewHeight = viewport.height > 0 ? viewport.height : windowHeight;
  const viewWidth = viewport.width > 0 ? viewport.width : windowWidth;
  const {
    mode,
    scale,
    quality,
    loaded: preferencesLoaded,
    keepAwake,
    selectMode,
    selectScale,
    selectQuality,
    selectKeepAwake,
  } = useReaderPreferences(mangaPath);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [readChapters, setReadChapters] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const downloaded = useIsChapterDownloaded(chapterPath);
  const fetcher = useCallback(
    async (signal: AbortSignal) => {
      const local = await loadDownloadedReader(chapterPath);

      return local ?? fetchReader(chapterPath, signal);
    },
    [chapterPath],
  );
  const { data, hasError, loading, reload } = useRemoteData(
    fetcher,
    readerCacheKey(chapterPath),
    {
      freshMs: downloaded ? 0 : CACHE_FRESH_MS.chapter,
      // A downloaded chapter is read from its own file; caching it to disk as
      // well meant reading and writing the same payload on every open.
      validate: downloaded ? undefined : isReaderData,
    },
  );
  const { page, setPage, total, restored } = useReaderProgress({
    path: chapterPath,
    title: chapterTitle,
    mangaPath,
    data,
  });
  const toggleChrome = useCallback(
    () => setChromeVisible((visible) => !visible),
    [],
  );
  const openChapter = (chapter: MangaChapter) => {
    setPickerOpen(false);

    if (chapter.path === chapterPath) {
      return;
    }

    setChapterPath(chapter.path);
    setChapterTitle(chapter.title);
    setChromeVisible(true);
    router.setParams({
      path: chapter.path,
      title: chapter.title,
      mangaPath,
    });
  };
  const showError = hasError && data !== null;
  const ready = preferencesLoaded && restored;

  // Pages, where the payload came from and the total wait: a download that
  // keeps falling back to the network shows up here.
  useOpenLog('reader', chapterPath, readerOpenFields(data, downloaded));

  // Warm the next chapter once the last pages of this one are on screen, so
  // "next" opens from cache instead of waiting on zonatmo.
  useEffect(() => {
    if (data?.next === undefined || total === 0 || page < total - 3) {
      return;
    }

    void prefetchChapter(data.next.path);
  }, [data, page, total]);
  useFocusEffect(
    useCallback(() => {
      let active = true;

      if (mangaPath) {
        void loadReadChapters(mangaPath).then((reads) => {
          if (active) {
            setReadChapters(reads);
          }
        });
      } else {
        setReadChapters([]);
      }

      return () => {
        active = false;
      };
      // pickerOpen is a refresh trigger: read marks must reload when it opens.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mangaPath, pickerOpen]),
  );

  useReaderBack({
    settingsOpen,
    pickerOpen,
    chromeVisible,
    ready,
    setSettingsOpen,
    setPickerOpen,
    setChromeVisible,
  });

  const goBack = () => goBackOrTabs(router);

  return (
    // The reader fills the whole window behind both system bars.
    <View className="flex-1" style={{ backgroundColor: reader.background }}>
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
        <View
          className="flex-1"
          importantForAccessibility={sheetAccessibility(pickerOpen, settingsOpen)}
        >
          {!ready || (loading && !data) ? (
            <ReaderSkeleton width={viewWidth} height={viewHeight} mode={mode} />
          ) : hasError && !data ? (
            <ErrorState
              message="No se pudo cargar el capítulo"
              tone="dark"
              onRetry={reload}
            />
          ) : data ? (
            <ReaderPages
              key={chapterPath}
              data={data}
              mode={mode}
              scale={scale}
              quality={quality}
              page={page}
              width={viewWidth}
              height={viewHeight}
              bottomInset={insets.bottom}
              onPageChange={setPage}
              onToggleChrome={toggleChrome}
              onOpenNext={openChapter}
            />
          ) : null}

          {chromeVisible ? (
            <ReaderProgressBar
              page={page}
              total={total}
              bottomInset={insets.bottom}
            />
          ) : null}
          <ReaderChrome
            title={readerTitle(data, chapterTitle)}
            subtitle={readerSubtitle(data, chapterTitle)}
            visible={chromeVisible}
            showError={showError}
            topInset={insets.top}
            onBack={goBack}
            onOpenPicker={() => setPickerOpen(true)}
            onOpenSettings={() => setSettingsOpen(true)}
            onRetry={reload}
          />
        </View>
        <ChapterPicker
          visible={pickerOpen}
          chapters={data ? ascendingChapters(data.chapters) : []}
          currentPath={chapterPath}
          readChapters={readChapters}
          onClose={() => setPickerOpen(false)}
          onSelect={openChapter}
        />
        <ReaderSettingsSheet
          visible={settingsOpen}
          mode={mode}
          scale={scale}
          quality={quality}
          keepAwake={keepAwake}
          onClose={() => setSettingsOpen(false)}
          onSelectMode={selectMode}
          onSelectScale={selectScale}
          onSelectQuality={selectQuality}
          onSelectKeepAwake={selectKeepAwake}
        />
      </View>
    </View>
  );
}
