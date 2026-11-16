import { Feather } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { reader, useColors } from '../theme/colors';
import { APP_BAR_GAP } from '../theme/spacing';
import { AnimatedPressable } from './AnimatedPressable';

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  action,
  tone = 'auto',
}: {
  title?: string;
  subtitle?: string;
  onBack: () => void;
  action?: ReactNode;
  tone?: 'auto' | 'dark';
}) {
  const colors = useColors();
  const textColor = tone === 'dark' ? reader.text : colors.text;
  const mutedColor = tone === 'dark' ? reader.textMuted : colors.textMuted;

  return (
    <View
      className="flex-row items-center px-2 py-1"
      style={{ marginBottom: APP_BAR_GAP }}
    >
      <AnimatedPressable
        onPress={onBack}
        accessibilityLabel="Volver"
        hitSlop={8}
        className="min-h-12 min-w-12 items-center justify-center rounded-full"
      >
        <Feather name="chevron-left" size={24} color={textColor} />
      </AnimatedPressable>
      {title !== undefined ? (
        <View className="ml-1 flex-1">
          <Text
            numberOfLines={1}
            className="text-base font-semibold"
            style={{ color: textColor }}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              numberOfLines={1}
              className="text-xs"
              style={{ color: mutedColor }}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      ) : (
        <View className="flex-1" />
      )}
      {action ? <View className="ml-2">{action}</View> : null}
    </View>
  );
}
