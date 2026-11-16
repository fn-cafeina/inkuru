import { Switch } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { useColors } from '../theme/colors';
import { SettingRow } from './SettingRow';

/**
 * A full-row boolean setting where the native switch is the control: the
 * row is static, so tapping the knob toggles it without the row firing a
 * second time.
 */
export function SwitchRow({
  icon,
  title,
  subtitle,
  divider = false,
  value,
  onValueChange,
}: {
  icon?: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
  divider?: boolean;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  const colors = useColors();

  return (
    <SettingRow
      icon={icon}
      title={title}
      subtitle={subtitle}
      divider={divider}
      trailing={
        <Switch
          accessibilityLabel={title}
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: '#404040', true: colors.accent }}
          thumbColor="#ffffff"
        />
      }
    />
  );
}
