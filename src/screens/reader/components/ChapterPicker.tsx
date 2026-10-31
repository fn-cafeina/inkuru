import { useMemo } from 'react';
import { Feather } from '@expo/vector-icons';
import { FlatList, Text, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppPressable } from '../../../components/AppPressable';
import {
  CHAPTER_ROW_HEIGHT,
  CHAPTER_ROW_STEP,
  ChapterRow,
} from '../../../components/ChapterRow';
import { ListDivider } from '../../../components/ListDivider';
import type { MangaChapter } from '../../../source/leercapitulo';
import { useColors } from '../../../theme/colors';
import { APP_BAR_GAP, SHEET_HEIGHT } from '../../../theme/spacing';

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
  const currentIndex = chapters.findIndex(
    (chapter) => chapter.path === currentPath,
  );
  const readSet = useMemo(() => new Set(readChapters), [readChapters]);

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      entering={FadeIn.duration(120)}
      className="absolute inset-0 justify-end"
      style={{ zIndex: 50 }}
    >
      <AppPressable
        accessible={false}
        onPress={onClose}
        pressFeedback={false}
        className="absolute inset-0"
        style={{ backgroundColor: colors.scrim }}
      />
      <Animated.View
        entering={SlideInDown.duration(200)}
        className="rounded-t-2xl"
        style={{ backgroundColor: colors.surface, height: SHEET_HEIGHT }}
      >
        <View className="min-h-14 flex-row items-center justify-between px-4">
          <Text
            className="text-base font-semibold"
            style={{ color: colors.text }}
          >
            Capítulos
          </Text>
          <AppPressable
            accessibilityLabel="Cerrar"
            onPress={onClose}
            className="min-h-12 min-w-12 items-center justify-center rounded-full"
          >
            <Feather name="x" size={20} color={colors.textMuted} />
          </AppPressable>
        </View>
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
      </Animated.View>
    </Animated.View>
  );
}
