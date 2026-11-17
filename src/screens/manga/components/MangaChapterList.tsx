import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { Alert, FlatList, RefreshControl, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { ChapterRow } from '../../../components/ChapterRow';
import { EmptyState } from '../../../components/EmptyState';
import { RefreshNotice } from '../../../components/RefreshNotice';
import {
  cancelDownload,
  deleteDownload,
  enqueueDownload,
  getDownloadState,
} from '../../../downloads/manager';
import { useDownloadVersion } from '../../../hooks/useDownloads';
import type { MangaChapter, MangaDetail } from '../../../source/zonatmo';
import { useColors } from '../../../theme/colors';
import type { ChapterRange } from '../chapters';
import { getChapterState } from '../chapters';
import { ChapterDownloadButton } from './ChapterDownloadButton';
import { MangaHeader } from './MangaHeader';

type Props = {
  /** Back + bookmark row; scrolls away with the hero, like rokimu. */
  topBar: ReactNode;
  manga: MangaDetail;
  mangaPath: string;
  chapters: MangaChapter[];
  ranges: ChapterRange[];
  rangeIndex: number;
  sortOrder: 'asc' | 'desc';
  readChapters: string[];
  currentChapterPath?: string;
  resumeChapter?: MangaChapter;
  bottomInset: number;
  refreshing: boolean;
  refreshError: boolean;
  ready: boolean;
  onRefresh: () => void;
  onSelectRange: (index: number) => void;
  onToggleSort: () => void;
  onOpen: (chapter: MangaChapter) => void;
  /** Transient acknowledgement of the library toggle. */
  notice?: string | null;
};

export function MangaChapterList({
  topBar,
  manga,
  mangaPath,
  chapters,
  ranges,
  rangeIndex,
  sortOrder,
  readChapters,
  currentChapterPath,
  resumeChapter,
  bottomInset,
  refreshing,
  refreshError,
  ready,
  onRefresh,
  onSelectRange,
  onToggleSort,
  onOpen,
  notice = null,
}: Props) {
  const readSet = useMemo(() => new Set(readChapters), [readChapters]);
  const readCount = useMemo(
    () =>
      manga.chapters.reduce(
        (count, chapter) => (readSet.has(chapter.path) ? count + 1 : count),
        0,
      ),
    [manga.chapters, readSet],
  );
  const colors = useColors();
  useDownloadVersion();

  const handleDownload = (chapter: MangaChapter) => {
    const status = getDownloadState(chapter.path)?.status;

    if (status === 'done') {
      Alert.alert(
        'Eliminar descarga',
        `Se eliminará ${chapter.title} del dispositivo.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: () => {
              void deleteDownload(chapter.path);
            },
          },
        ],
      );
      return;
    }

    if (status === 'queued' || status === 'downloading') {
      cancelDownload(chapter.path);
      return;
    }

    void enqueueDownload({
      chapterPath: chapter.path,
      chapterTitle: chapter.title,
      mangaPath,
      mangaTitle: manga.title,
    });
  };

  return (
    <FlatList
      style={{ flex: 1 }}
      data={chapters}
      keyExtractor={(item) => item.path}
      ItemSeparatorComponent={InsetDivider}
      renderItem={({ item }) => (
        <View className="mx-5">
          <ChapterRow
            title={item.title}
            state={getChapterState(item.path, currentChapterPath, readSet)}
            trailing={
              <ChapterDownloadButton
                title={item.title}
                state={getDownloadState(item.path)}
                onPress={() => handleDownload(item)}
              />
            }
            onPress={() => onOpen(item)}
          />
        </View>
      )}
      ListHeaderComponent={
        <View>
          {topBar}
          <MangaHeader
            manga={manga}
            readCount={readCount}
            resumeChapter={resumeChapter}
            sortOrder={sortOrder}
            ranges={ranges}
            activeRange={rangeIndex}
            onSelectRange={onSelectRange}
            onToggleSort={onToggleSort}
            onRead={onOpen}
            ready={ready}
          />
          {notice ? (
            <View className="mx-5 my-2 min-h-12 flex-row items-center rounded-xl bg-neutral-900 px-4">
              <Feather name="check" size={16} color={colors.accent} />
              <Text
                accessibilityLiveRegion="polite"
                className="ml-2 text-sm text-neutral-200"
              >
                {notice}
              </Text>
            </View>
          ) : null}
          {refreshError ? (
            <RefreshNotice
              message="No se pudo actualizar"
              onRetry={onRefresh}
            />
          ) : null}
        </View>
      }
      ListFooterComponent={
        <View style={{ height: bottomInset + 24 }} />
      }
      ListEmptyComponent={<EmptyState title="Sin capítulos disponibles" />}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.accent]}
          progressBackgroundColor={colors.surface}
        />
      }
      contentContainerStyle={{
        flexGrow: 1,
      }}
      showsVerticalScrollIndicator={false}
    />
  );
}

/** Divider under the 20px row margin, aligned with the row text. */
function InsetDivider() {
  return <View className="ml-9 h-px bg-neutral-800" />;
}
