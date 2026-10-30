import { Feather } from '@expo/vector-icons';
import { FlatList, Modal, Text, View } from 'react-native';
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

export function ChapterPicker({
  visible,
  chapters,
  current,
  onClose,
  onSelect,
}: {
  visible: boolean;
  chapters: MangaChapter[];
  current: number;
  onClose: () => void;
  onSelect: (chapter: MangaChapter) => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View
        className="flex-1 justify-end"
        style={{ backgroundColor: colors.scrim }}
      >
        <AppPressable
          accessible={false}
          onPress={onClose}
          pressFeedback={false}
          className="absolute inset-0"
        />
        <View
          className="rounded-t-2xl"
          style={{ backgroundColor: colors.surface, maxHeight: '70%' }}
        >
          <View className="flex-row items-center justify-between px-4">
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
            initialScrollIndex={
              chapters.length > 0
                ? Math.min(Math.max(current, 0), chapters.length - 1)
                : undefined
            }
            renderItem={({ item, index }) => (
              <ChapterRow
                title={item.title}
                state={index === current ? 'selected' : undefined}
                onPress={() => onSelect(item)}
              />
            )}
            contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
          />
        </View>
      </View>
    </Modal>
  );
}
