import { useEffect, useMemo, useRef } from 'react';
import type { ComponentRef } from 'react';
import {
  AccessibilityInfo,
  FlatList,
  Text,
  View,
  findNodeHandle,
} from 'react-native';
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
import { ReaderSheet, SHEET_HEIGHT } from './ReaderSheet';

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
  const currentRef = useRef<ComponentRef<typeof View>>(null);

  // A 200-chapter list opens scrolled to the current chapter for the eye; screen
  // readers would still start at the sheet header, so move the focus too.
  useEffect(() => {
    if (!visible) {
      return;
    }

    const timer = setTimeout(() => {
      const current = currentRef.current;
      const node = current ? findNodeHandle(current) : null;

      if (node !== null && node !== undefined) {
        AccessibilityInfo.setAccessibilityFocus(node);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible) {
    return null;
  }

  const currentIndex = chapters.findIndex(
    (chapter) => chapter.path === currentPath,
  );

  return (
    <ReaderSheet
      title="Capítulos"
      onClose={onClose}
      height={SHEET_HEIGHT.tall}
    >
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
        renderItem={({ item }) =>
          item.path === currentPath ? (
            <View ref={currentRef}>
              <ChapterRow
                title={item.title}
                state="selected"
                onPress={() => onSelect(item)}
              />
            </View>
          ) : (
            <ChapterRow
              title={item.title}
              state={readSet.has(item.path) ? 'read' : undefined}
              onPress={() => onSelect(item)}
            />
          )
        }
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
