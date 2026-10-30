import { Text } from 'react-native';

import { AppPressable } from './AppPressable';
import { useColors } from '../theme/colors';

export function OptionChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useColors();

  return (
    <AppPressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={
        selected
          ? { backgroundColor: colors.accentContainer, borderColor: 'transparent' }
          : { borderColor: colors.border }
      }
      className="min-h-10 items-center justify-center rounded-full border px-3.5"
    >
      <Text
        className={selected ? 'text-sm font-semibold' : 'text-sm'}
        style={{ color: selected ? colors.onAccentContainer : colors.text }}
      >
        {label}
      </Text>
    </AppPressable>
  );
}
