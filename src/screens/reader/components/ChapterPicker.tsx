import { useMemo, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { FlatList, Text, TextInput, View } from 'react-native';
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
import { APP_BAR_GAP, SHEET_MAX_HEIGHT } from '../../../theme/spacing';

export function ChapterPicker({
  visible,
  chapters,
  currentPath,
  onClose,
  onSelect,
}: {
  visible: boolean;
  chapters: MangaChapter[];
  currentPath: string;
  onClose: () => void;
  onSelect: (chapter: MangaChapter) => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const showFilter = chapters.length > 50;
  const currentIndex = chapters.findIndex(
    (chapter) => chapter.path === currentPath,
  );
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return chapters;
    }

    return chapters.filter((chapter) =>
      chapter.title.toLowerCase().includes(normalized),
    );
  }, [chapters, query]);

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
        style={{
          backgroundColor: colors.surface,
          maxHeight: SHEET_MAX_HEIGHT,
        }}
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
          {showFilter ? (
            <View className="mx-4 mb-2 min-h-12 flex-row items-center rounded-full bg-zinc-100 px-3 dark:bg-zinc-800">
              <Feather
                name="search"
                size={16}
                color={colors.iconInactive}
              />
              <TextInput
                value={query}
                onChangeText={setQuery}
                accessibilityLabel="Buscar capítulo"
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="Buscar capítulo"
                placeholderTextColor={colors.iconInactive}
                className="min-h-12 flex-1 px-2 text-sm"
                style={{ color: colors.text }}
              />
              {query ? (
                <AppPressable
                  accessibilityLabel="Limpiar búsqueda"
                  onPress={() => setQuery('')}
                  hitSlop={8}
                  className="min-h-12 min-w-12 items-center justify-center rounded-full"
                >
                  <Feather name="x" size={16} color={colors.iconInactive} />
                </AppPressable>
              ) : null}
            </View>
          ) : null}
          <FlatList
            key={query}
            data={filtered}
            keyExtractor={(item) => item.path}
            ItemSeparatorComponent={ListDivider}
            // Rows are CHAPTER_ROW_HEIGHT plus a 1px divider (CHAPTER_ROW_STEP).
            getItemLayout={(_, index) => ({
              length: CHAPTER_ROW_HEIGHT,
              offset: CHAPTER_ROW_STEP * index,
              index,
            })}
            initialScrollIndex={
              !query && currentIndex >= 0 ? currentIndex : undefined
            }
            renderItem={({ item }) => (
              <ChapterRow
                title={item.title}
                state={item.path === currentPath ? 'selected' : undefined}
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
