import { useEffect, useMemo, useRef } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';

import { ChapterRow } from '../../../components/ChapterRow';
import { EmptyState } from '../../../components/EmptyState';
import { ListDivider } from '../../../components/ListDivider';
import type { MangaChapter, MangaDetail } from '../../../source/leercapitulo';
import type { ChapterRange } from '../chapters';
import { getChapterState } from '../chapters';
import { MangaHeader } from './MangaHeader';

type Props = {
  manga: MangaDetail;
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
  onRefresh: () => void;
  onSelectRange: (index: number) => void;
  onToggleSort: () => void;
  onOpen: (chapter: MangaChapter) => void;
  onScrollPast: (past: boolean) => void;
};

export function MangaChapterList({
  manga,
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
  onRefresh,
  onSelectRange,
  onToggleSort,
  onOpen,
  onScrollPast,
}: Props) {
  const readSet = useMemo(() => new Set(readChapters), [readChapters]);
  const listRef = useRef<FlatList<MangaChapter>>(null);

  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [rangeIndex, sortOrder]);

  return (
    <FlatList
      ref={listRef}
      data={chapters}
      keyExtractor={(item) => item.path}
      ItemSeparatorComponent={ListDivider}
      renderItem={({ item }) => (
        <ChapterRow
          title={item.title}
          date={item.date}
          state={getChapterState(item.path, currentChapterPath, readSet)}
          onPress={() => onOpen(item)}
        />
      )}
      ListHeaderComponent={
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
        />
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
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    />
  );
}
