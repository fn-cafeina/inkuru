import { Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { AppPressable } from './AppPressable';
import { useColors } from '../theme/colors';

export type ChapterRowState = 'current' | 'read' | 'selected';

/** Base height of a chapter row; dividers add 1px on top (see CHAPTER_ROW_STEP). */
export const CHAPTER_ROW_HEIGHT = 56;
export const CHAPTER_ROW_STEP = CHAPTER_ROW_HEIGHT + 1;

const TITLE_CLASS: Record<ChapterRowState | 'none', string> = {
  current: 'flex-1 text-sm font-semibold text-accent-500',
  selected: 'flex-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100',
  read: 'flex-1 text-sm text-zinc-400 line-through dark:text-zinc-500',
  none: 'flex-1 text-sm text-zinc-900 dark:text-zinc-100',
};

export function ChapterRow({
  title,
  date,
  state,
  onPress,
}: {
  title: string;
  date?: string;
  state?: ChapterRowState;
  onPress: () => void;
}) {
  const colors = useColors();

  return (
    <AppPressable
      accessibilityRole="button"
      accessibilityLabel={state === 'current' ? `${title}, leyendo` : title}
      accessibilityState={{
        selected: state === 'current' || state === 'selected',
      }}
      onPress={onPress}
      className={`min-h-14 flex-row items-center border-l-2 px-4 py-3 ${
        state === 'current' ? 'border-accent-500' : 'border-transparent'
      }`}
    >
      <Text numberOfLines={1} className={TITLE_CLASS[state ?? 'none']}>
        {title}
      </Text>
      {date ? (
        <Text className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
          {date}
        </Text>
      ) : null}
      {state === 'selected' ? (
        <View className="ml-2">
          <Feather name="check" size={18} color={colors.accent} />
        </View>
      ) : null}
    </AppPressable>
  );
}
