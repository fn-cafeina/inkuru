import { useMemo } from 'react';
import { FlatList, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  CHAPTER_ROW_HEIGHT,
  CHAPTER_ROW_STEP,
  ChapterRow,
} from '../../../components/ChapterRow';
import { ListDivider } from '../../../components/ListDivider';
import type { MangaChapter } from '../../../source/zonatmo';
import { useColors } from '../../../theme/colors';
import { APP_BAR_GAP } from '../../../theme/spacing';
import { ReaderSheet } from './ReaderSheet';

export function ChapterPicker({
  visible,
  chapters,
  currentPath,
  readChapters,
  onClose,
  onSelect,
}: {
  visible: boolean;
  chapters: MangaChapter[];
  currentPath: string;
  readChapters: string[];
  onClose: () => void;
  onSelect: (chapter: MangaChapter) => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const readSet = useMemo(() => new Set(readChapters), [readChapters]);

  if (!visible) {
    return null;
  }

  const currentIndex = chapters.findIndex(
    (chapter) => chapter.path === currentPath,
  );

  return (
    <ReaderSheet title="Capítulos" onClose={onClose}>
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
        initialScrollIndex={currentIndex >= 0 ? currentIndex : undefined}
        renderItem={({ item }) => (
          <ChapterRow
            title={item.title}
            state={
              item.path === currentPath
                ? 'selected'
                : readSet.has(item.path)
                  ? 'read'
                  : undefined
            }
            onPress={() => onSelect(item)}
          />
        )}
        ListEmptyComponent={
          <View className="items-center py-8">
            <Text className="text-sm" style={{ color: colors.textMuted }}>
              Sin capítulos
            </Text>
          </View>
        }
        contentContainerStyle={{
          paddingTop: APP_BAR_GAP,
          paddingBottom: insets.bottom + 16,
        }}
      />
    </ReaderSheet>
  );
}
