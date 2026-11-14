import type { ReactNode } from 'react';
import type { AccessibilityState } from 'react-native';
import { Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { useColors } from '../theme/colors';
import { AnimatedPressable } from './AnimatedPressable';

/**
 * A settings row in the sober pattern: icon, title, and a subtitle that
 * carries the state instead of a separate value. `trailing` hosts the inline
 * action or a switch.
 */
export function SettingRow({
  icon,
  iconColor,
  title,
  subtitle,
  subtitleColor,
  divider = false,
  disabled = false,
  onPress,
  trailing,
  accessibilityRole = 'button',
  accessibilityState,
}: {
  icon?: keyof typeof Feather.glyphMap;
  /** Defaults to the inactive icon color; pass the accent for actions. */
  iconColor?: string;
  title: string;
  subtitle?: string;
  /** Defaults to the muted hint color; pass a state color when it matters. */
  subtitleColor?: string;
  divider?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  trailing?: ReactNode;
  accessibilityRole?: 'button' | 'switch';
  accessibilityState?: AccessibilityState;
}) {
  const colors = useColors();

  const content = (
    <>
      {divider ? (
        <View className="absolute left-4 right-0 top-0 h-px bg-zinc-200 dark:bg-neutral-800" />
      ) : null}
      {icon !== undefined ? (
        <Feather
          name={icon}
          size={18}
          color={iconColor ?? colors.iconInactive}
          style={{ marginRight: 12 }}
        />
      ) : null}
      <View className="flex-1 pr-3">
        <Text className="text-base text-zinc-900 dark:text-zinc-100">
          {title}
        </Text>
        {subtitle !== undefined ? (
          <Text
            className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400"
            style={subtitleColor === undefined ? undefined : { color: subtitleColor }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
    </>
  );

  if (onPress === undefined) {
    return <View className="min-h-14 flex-row items-center px-4">{content}</View>;
  }

  return (
    <AnimatedPressable
      accessibilityRole={accessibilityRole}
      accessibilityState={accessibilityState}
      hapticFeedback
      disabled={disabled}
      onPress={onPress}
      className="min-h-14 flex-row items-center px-4"
    >
      {content}
    </AnimatedPressable>
  );
}
