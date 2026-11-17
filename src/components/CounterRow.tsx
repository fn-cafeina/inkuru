import { Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { AnimatedPressable } from './AnimatedPressable';
import { SettingRow } from './SettingRow';
import { useColors } from '../theme/colors';

/**
 * A settings row whose trailing action is a minus/plus counter, like the
 * download concurrency. The row is a SettingRow, so it keeps the shared
 * icon, subtitle and divider; only the value is state instead of a label.
 */
export function CounterRow({
  icon,
  title,
  subtitle,
  accessibilityLabel,
  value,
  min,
  max,
  divider = false,
  onChange,
}: {
  icon?: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
  /** Setting name the step buttons announce; defaults to the title. */
  accessibilityLabel?: string;
  value: number;
  min: number;
  max: number;
  divider?: boolean;
  onChange: (value: number) => void;
}) {
  const settingName = accessibilityLabel ?? title;
  const step = (delta: number) => {
    const next = Math.min(max, Math.max(min, value + delta));

    if (next !== value) {
      onChange(next);
    }
  };

  return (
    <SettingRow
      icon={icon}
      title={title}
      subtitle={subtitle}
      divider={divider}
      trailing={
        <View className="flex-row items-center">
          <CounterButton
            name="minus"
            label={`Disminuir ${settingName}`}
            disabled={value <= min}
            onPress={() => step(-1)}
          />
          <Text className="w-8 text-center text-base font-semibold text-white">
            {value}
          </Text>
          <CounterButton
            name="plus"
            label={`Aumentar ${settingName}`}
            disabled={value >= max}
            onPress={() => step(1)}
          />
        </View>
      }
    />
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
      accessibilityState={{ disabled }}
      hapticFeedback
      disabled={disabled}
      hitSlop={6}
      onPress={onPress}
      className="min-h-8 min-w-8 items-center justify-center rounded-full"
    >
      <Feather
        name={name}
        size={18}
        color={disabled ? '#404040' : colors.textMuted}
      />
    </AnimatedPressable>
  );
}
