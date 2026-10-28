import { Text } from 'react-native';

import { AppPressable } from './AppPressable';

export function OptionChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <AppPressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      className={
        selected
          ? 'min-h-12 items-center justify-center rounded-lg border border-transparent bg-accent-500 px-3'
          : 'min-h-12 items-center justify-center rounded-lg border border-zinc-200 px-3 dark:border-zinc-800'
      }
    >
      <Text
        className={
          selected
            ? 'text-sm font-semibold text-white'
            : 'text-sm text-zinc-700 dark:text-zinc-300'
        }
      >
        {label}
      </Text>
    </AppPressable>
  );
}
