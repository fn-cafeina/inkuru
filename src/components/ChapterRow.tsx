import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { AppPressable } from './AppPressable';
import { useColors } from '../theme/colors';

export type ChapterRowState = 'current' | 'read' | 'selected';

/** Base height of a chapter row; dividers add 1px on top (see CHAPTER_ROW_STEP). */
export const CHAPTER_ROW_HEIGHT = 56;
export const CHAPTER_ROW_STEP = CHAPTER_ROW_HEIGHT + 1;

const TITLE_CLASS: Record<ChapterRowState | 'none', string> = {
  current: 'flex-1 text-sm font-semibold',
  selected: 'flex-1 text-sm font-semibold',
  read: 'flex-1 text-sm text-zinc-500 line-through dark:text-zinc-400',
  none: 'flex-1 text-sm text-zinc-900 dark:text-zinc-100',
};

export function ChapterRow({
  title,
  date,
  state,
  trailing,
  onPress,
}: {
  title: string;
  date?: string;
  state?: ChapterRowState;
  trailing?: ReactNode;
  onPress: () => void;
}) {
  const colors = useColors();
  const highlighted = state === 'current' || state === 'selected';
  const stateLabel =
    state === 'current' ? ', leyendo' : state === 'read' ? ', leído' : '';

  return (
    <AppPressable
      accessibilityRole="button"
      accessibilityLabel={`${title}${stateLabel}`}
      accessibilityState={{ selected: highlighted }}
      onPress={onPress}
      style={highlighted ? { backgroundColor: colors.accentContainer } : undefined}
      className="min-h-14 flex-row items-center px-4 py-3"
    >
      <Text
        numberOfLines={1}
        className={TITLE_CLASS[state ?? 'none']}
        style={highlighted ? { color: colors.onAccentContainer } : undefined}
      >
        {title}
      </Text>
      {date ? (
        <Text className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
          {date}
        </Text>
      ) : null}
      {trailing ? <View className="ml-2">{trailing}</View> : null}
      {state === 'selected' ? (
        <View className="ml-2">
          <Feather name="check" size={18} color={colors.accent} />
        </View>
      ) : null}
    </AppPressable>
  );
}
