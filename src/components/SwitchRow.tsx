import { Switch } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { useColors } from '../theme/colors';
import { SettingRow } from './SettingRow';

/**
 * A full-row boolean setting. The row owns the gesture and the a11y role,
 * so the switch is decoration only: no handler, or it would be pressed
 * twice.
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
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onValueChange(!value)}
      trailing={
        <Switch
          accessible={false}
          pointerEvents="none"
          value={value}
          trackColor={{ false: colors.iconInactive, true: colors.accent }}
          thumbColor="#ffffff"
        />
      }
    />
  );
}
