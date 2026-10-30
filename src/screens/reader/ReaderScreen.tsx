import { useCallback, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { NavigationBar } from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorState } from '../../components/ErrorState';
import { ChapterPicker } from './components/ChapterPicker';
import { ReaderChrome } from './components/ReaderChrome';
import { ReaderSettingsSheet } from './components/ReaderSettingsSheet';
import { ReaderSkeleton } from './components/ReaderSkeleton';
import { ReaderPages } from './pages/ReaderPages';
import { useRemoteData } from '../../hooks/useRemoteData';
import { useReaderPreferences } from './useReaderPreferences';
import { useReaderProgress } from './useReaderProgress';
import { fetchReader } from '../../source/leercapitulo';
import type { MangaChapter, ReaderData } from '../../source/leercapitulo';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Reader'>;

function readerTitle(data: ReaderData | null, fallback: string): string {
  return data?.mangaTitle ?? data?.title ?? fallback;
}

function readerSubtitle(
  data: ReaderData | null,
  title: string,
  page: number,
  total: number,
): string | undefined {
  if (!data) {
    return undefined;
  }

  return [
    data.mangaTitle ? data.title || title : undefined,
    total > 0 ? `${page + 1}/${total}` : undefined,
  ]
    .filter(Boolean)
    .join(' · ');
}

export default function ReaderScreen({ navigation, route }: Props) {
  const { path, title, mangaPath } = route.params;
  const insets = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const viewHeight = viewport.height > 0 ? viewport.height : windowHeight;
  const viewWidth = viewport.width > 0 ? viewport.width : windowWidth;
  const { mode, scale, quality, selectMode, selectScale, selectQuality } =
    useReaderPreferences();
  const [chromeVisible, setChromeVisible] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const fetcher = useCallback(
    (signal: AbortSignal) => fetchReader(path, signal),
    [path],
  );
  const { data, hasError, loading, reload } = useRemoteData(
    fetcher,
    `reader:${path}`,
  );
  const { page, setPage, total } = useReaderProgress({
    path,
    title,
    mangaPath,
    data,
  });
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
  const showError = hasError && data !== null;

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
          <ErrorState
            message="No se pudo cargar el capítulo"
            tone="dark"
            onRetry={reload}
          />
        ) : !data ? (
          <ReaderSkeleton height={viewHeight} />
        ) : (
          <ReaderPages
            data={data}
            mode={mode}
            scale={scale}
            quality={quality}
            page={page}
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
        )}

        <ReaderChrome
          title={readerTitle(data, title)}
          subtitle={readerSubtitle(data, title, page, total)}
          visible={chromeVisible}
          showError={showError}
          topInset={insets.top}
          onBack={() => navigation.goBack()}
          onOpenPicker={() => setPickerOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          onRetry={reload}
        />
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
