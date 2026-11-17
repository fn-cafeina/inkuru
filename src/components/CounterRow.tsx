import { Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { AnimatedPressable } from './AnimatedPressable';
import { useColors } from '../theme/colors';

/**
 * A settings row whose trailing action is a minus/plus counter, like the
 * download concurrency. The value is state, not a label.
 */
export function CounterRow({
  title,
  subtitle,
  value,
  min,
  max,
  onChange,
}: {
  title: string;
  subtitle?: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const step = (delta: number) => {
    const next = Math.min(max, Math.max(min, value + delta));

    if (next !== value) {
      onChange(next);
    }
  };

  return (
    <View className="flex-row items-center px-5 py-4">
      <View className="flex-1 pr-3">
        <Text className="text-base font-medium text-white">{title}</Text>
        {subtitle !== undefined ? (
          <Text className="mt-1 text-xs font-semibold tracking-wide text-neutral-400">
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View className="flex-row items-center">
        <CounterButton
          name="minus"
          label={`Disminuir ${title}`}
          disabled={value <= min}
          onPress={() => step(-1)}
        />
        <Text className="w-10 text-center text-base font-semibold text-white">
          {value}
        </Text>
        <CounterButton
          name="plus"
          label={`Aumentar ${title}`}
          disabled={value >= max}
          onPress={() => step(1)}
        />
      </View>
    </View>
  );
}

function CounterButton({
  name,
  label,
  disabled,
  onPress,
}: {
  name: 'minus' | 'plus';
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const colors = useColors();

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      hitSlop={4}
      onPress={onPress}
      className="min-h-9 min-w-9 items-center justify-center rounded-full"
    >
      <Feather
        name={name}
        size={18}
        color={disabled ? '#404040' : colors.textMuted}
      />
    </AnimatedPressable>
  );
}
