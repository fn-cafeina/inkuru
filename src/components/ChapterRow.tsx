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

// One look for every row: nothing dims or strikes a read chapter, the bar
// underneath says how far it went.
const TITLE_CLASS = 'flex-1 text-base font-semibold';

function stateLabel(
  state: ChapterRowState | undefined,
  read: boolean,
): string {
  if (state === 'current' || state === 'selected') {
    return ', leyendo';
  }

  return read ? ', leído' : '';
}

/** Width of the filled part of the bar, or null when there is nothing to draw. */
function barWidth(progress: number | undefined): string | null {
  if (progress === undefined || progress <= 0) {
    return null;
  }

  return `${Math.min(1, progress) * 100}%`;
}

export function ChapterRow({
  title,
  state,
  read = false,
  progress,
  trailing,
  onPress,
  className,
}: {
  title: string;
  state?: ChapterRowState;
  /** Read only feeds the accessibility label now; the bar carries the visual. */
  read?: boolean;
  /** Share of the chapter read, 0 to 1. Nothing drawn at 0 or undefined. */
  progress?: number;
  trailing?: ReactNode;
  onPress: () => void;
  /** Extra sizing for contexts that need a taller row, like the reader picker. */
  className?: string;
}) {
  const colors = useColors();
  const highlighted = state === 'current' || state === 'selected';
  const titleStyle = highlighted
    ? { color: colors.onAccentContainer }
    : undefined;
  const filled = barWidth(progress);

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={`${title}${stateLabel(state, read)}`}
      accessibilityState={{ selected: highlighted }}
      onPress={onPress}
      style={highlighted ? { backgroundColor: colors.accentContainer } : undefined}
      className={`relative flex-row items-center p-4 ${className ?? ''}`}
    >
      <Text numberOfLines={1} className={TITLE_CLASS} style={titleStyle}>
        {title}
      </Text>
      {trailing ? <View className="ml-2">{trailing}</View> : null}
      {state === 'selected' ? (
        <View className="ml-2">
          <Feather name="check" size={18} color={colors.accent} />
        </View>
      ) : null}
      {filled === null ? null : (
        // Absolute so the row keeps its 56px height and the picker's
        // getItemLayout stays true.
        <View
          className="absolute bottom-0 left-0 right-0 h-0.5"
          style={{ backgroundColor: colors.border }}
        >
          <View
            className="h-full"
            style={{ width: filled, backgroundColor: colors.accent }}
          />
        </View>
      )}
    </AnimatedPressable>
  );
}
