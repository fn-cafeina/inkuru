import { useEffect, useMemo, useRef } from 'react';
import { Alert, FlatList, RefreshControl, View } from 'react-native';

import { ChapterRow } from '../../../components/ChapterRow';
import { EmptyState } from '../../../components/EmptyState';
import { ListDivider } from '../../../components/ListDivider';
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
  titleVisible: boolean;
  refreshing: boolean;
  refreshError: boolean;
  ready: boolean;
  onRefresh: () => void;
  onSelectRange: (index: number) => void;
  onToggleSort: () => void;
  onOpen: (chapter: MangaChapter) => void;
  onScrollPast: (past: boolean) => void;
};

export function MangaChapterList({
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
  titleVisible,
  refreshing,
  refreshError,
  ready,
  onRefresh,
  onSelectRange,
  onToggleSort,
  onOpen,
  onScrollPast,
}: Props) {
  const readSet = useMemo(() => new Set(readChapters), [readChapters]);
  const colors = useColors();
  const listRef = useRef<FlatList<MangaChapter>>(null);

  useDownloadVersion();

  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [rangeIndex]);

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
      ref={listRef}
      data={chapters}
      keyExtractor={(item) => item.path}
      ItemSeparatorComponent={ListDivider}
      renderItem={({ item }) => (
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
      )}
      ListHeaderComponent={
        <View>
          <MangaHeader
            manga={manga}
            readCount={readSet.size}
            resumeChapter={resumeChapter}
            sortOrder={sortOrder}
            ranges={ranges}
            activeRange={rangeIndex}
            onSelectRange={onSelectRange}
            onToggleSort={onToggleSort}
            onRead={onOpen}
            ready={ready}
          />
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
      onScroll={(event) => {
        const past = event.nativeEvent.contentOffset.y > 120;

        if (past !== titleVisible) {
          onScrollPast(past);
        }
      }}
      scrollEventThrottle={16}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.accent]}
          progressBackgroundColor={colors.surface}
        />
      }
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    />
  );
}
