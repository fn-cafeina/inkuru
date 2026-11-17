import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { Alert, FlatList, RefreshControl, View } from 'react-native';

import { ChapterRow } from '../../../components/ChapterRow';
import { EmptyState } from '../../../components/EmptyState';
import {
  cancelDownload,
  deleteDownload,
  enqueueDownload,
  getDownloadState,
} from '../../../downloads/manager';
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
  ready: boolean;
  onRefresh: () => void;
  onSelectRange: (index: number) => void;
  onToggleSort: () => void;
  onOpen: (chapter: MangaChapter) => void;
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
  ready,
  onRefresh,
  onSelectRange,
  onToggleSort,
  onOpen,
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
      ItemSeparatorComponent={RowGap}
      renderItem={({ item }) => (
        <View className="mx-5 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
          <ChapterRow
            title={item.title}
            state={getChapterState(item.path, currentChapterPath, readSet)}
            trailing={
              <ChapterDownloadButton
                path={item.path}
                title={item.title}
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

/** 12px of air between chapter cards, like rokimu's episode list. */
function RowGap() {
  return <View className="h-3" />;
}
