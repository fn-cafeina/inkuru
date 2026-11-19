import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { AnimatedPressable } from './AnimatedPressable';
import { useColors } from '@/theme/colors';

type ChapterRowState = 'current' | 'read' | 'selected';

/** Row height in the reader picker, where rows carry min-h-14; dividers add
 * 1px on top (see CHAPTER_ROW_STEP). */
export const CHAPTER_ROW_HEIGHT = 56;
export const CHAPTER_ROW_STEP = CHAPTER_ROW_HEIGHT + 1;

const TITLE_CLASS: Record<ChapterRowState | 'none', string> = {
  current: 'flex-1 text-base font-semibold',
  selected: 'flex-1 text-base font-semibold',
  read: 'flex-1 text-base text-neutral-400 line-through',
  none: 'flex-1 text-base font-semibold text-white',
};

export function ChapterRow({
  title,
  state,
  read = false,
  trailing,
  onPress,
  className,
}: {
  title: string;
  state?: ChapterRowState;
  /** Read wins over the row state: a finished chapter is struck through even
   *  while it is the one being read. */
  read?: boolean;
  trailing?: ReactNode;
  onPress: () => void;
  /** Extra sizing for contexts that need a taller row, like the reader picker. */
  className?: string;
}) {
  const colors = useColors();
  const highlighted = state === 'current' || state === 'selected';
  const stateLabel =
    state === 'current' || state === 'selected'
      ? ', leyendo'
      : read
        ? ', leído'
        : '';
  // `line-through` alone left some rows dimmed without the strike on Android,
  // so the decoration is set here too.
  const titleStyle = {
    ...(highlighted ? { color: colors.onAccentContainer } : null),
    ...(read ? { textDecorationLine: 'line-through' as const } : null),
  };

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={`${title}${stateLabel}`}
      accessibilityState={{ selected: highlighted }}
      onPress={onPress}
      style={highlighted ? { backgroundColor: colors.accentContainer } : undefined}
      className={`flex-row items-center p-4 ${className ?? ''}`}
    >
      <Text
        numberOfLines={1}
        className={read ? TITLE_CLASS.read : TITLE_CLASS[state ?? 'none']}
        style={titleStyle}
      >
        {title}
      </Text>
      {trailing ? <View className="ml-2">{trailing}</View> : null}
      {state === 'selected' ? (
        <View className="ml-2">
          <Feather name="check" size={18} color={colors.accent} />
        </View>
      ) : null}
    </AnimatedPressable>
  );
}
