import { Text } from 'react-native';

import { AnimatedPressable } from './AnimatedPressable';
import { useColors } from '../theme/colors';

export function OptionChip({
  label,
  selected,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  const colors = useColors();

  return (
    <AnimatedPressable
      accessibilityRole="radio"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      hitSlop={4}
      onPress={onPress}
      className="w-[90px] items-center rounded-lg bg-neutral-900 py-2"
      style={selected ? { backgroundColor: `${colors.accent}26` } : undefined}
    >
      <Text
        className={`text-xs ${selected ? '' : 'text-neutral-500'}`}
        style={selected ? { color: colors.accent } : undefined}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}
