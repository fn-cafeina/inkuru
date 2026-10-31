import { Text, View } from 'react-native';

import { AppPressable } from './AppPressable';
import { useColors } from '../theme/colors';

export function ChoiceRow({
  label,
  description,
  selected,
  divider = false,
  onPress,
}: {
  label: string;
  description?: string;
  selected: boolean;
  divider?: boolean;
  onPress: () => void;
}) {
  const colors = useColors();

  return (
    <AppPressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityHint={description}
      accessibilityState={{ selected }}
      onPress={onPress}
      className="min-h-14 flex-row items-center px-4"
    >
      {divider ? (
        <View className="absolute left-4 right-0 top-0 h-px bg-zinc-200 dark:bg-zinc-800" />
      ) : null}
      <View className="flex-1 pr-3">
        <Text className="text-base text-zinc-900 dark:text-zinc-100">
          {label}
        </Text>
        {description ? (
          <Text className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {description}
          </Text>
        ) : null}
      </View>
      <View
        className="h-5 w-5 items-center justify-center rounded-full border-2"
        style={{
          borderColor: selected ? colors.accent : colors.iconInactive,
        }}
      >
        {selected ? (
          <View
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: colors.accent }}
          />
        ) : null}
      </View>
    </AppPressable>
  );
}
