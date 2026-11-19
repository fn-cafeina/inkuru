import type { ReactNode } from 'react';
import { useCallback, useMemo } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';

import { EmptyState } from '../../../components/EmptyState';
import type { MangaChapter, MangaDetail } from '../../../source/zonatmo';
import { useColors } from '../../../theme/colors';
import type { ChapterRange } from '../chapters';
import { getChapterState } from '../chapters';
import { ChapterCard } from './ChapterCard';
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
  onOpenRelated: (path: string, title: string) => void;
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
  onOpenRelated,
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

  const openChapter = useCallback(
    (chapter: MangaChapter) => onOpen(chapter),
    [onOpen],
  );

  return (
    <FlatList
      style={{ flex: 1 }}
      data={chapters}
      keyExtractor={(item) => item.path}
      ItemSeparatorComponent={RowGap}
      renderItem={({ item }) => (
        <ChapterCard
          chapter={item}
          state={getChapterState(item.path, currentChapterPath, readSet)}
          read={readSet.has(item.path)}
          mangaPath={mangaPath}
          mangaTitle={manga.title}
          onOpen={openChapter}
        />
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
            onOpenRelated={onOpenRelated}
            onRead={onOpen}
            ready={ready}
          />
        </View>
      }
      ListFooterComponent={
        <View style={{ height: bottomInset + 24 }} />
      }
      ListEmptyComponent={
        <EmptyState icon="book" title="Sin capítulos disponibles" />
      }
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
      // 474 chapters at the defaults (windowSize 21) mount ~320 rows, each one a
      // pressable with its own download subscription. Five viewports is plenty
      // to scroll ahead of the finger.
      initialNumToRender={12}
      maxToRenderPerBatch={8}
      updateCellsBatchingPeriod={50}
      windowSize={5}
      removeClippedSubviews
      showsVerticalScrollIndicator={false}
    />
  );
}

/** 12px of air between chapter cards, like rokimu's episode list. */
function RowGap() {
  return <View className="h-3" />;
}
