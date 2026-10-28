import { Feather } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { useColors } from '../theme/colors';
import { AppPressable } from './AppPressable';

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  action,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
  action?: ReactNode;
}) {
  const colors = useColors();

  return (
    <View className="flex-row items-center px-2 py-2">
      <AppPressable
        onPress={onBack}
        accessibilityLabel="Volver"
        hitSlop={8}
        borderlessRipple
        className="min-h-12 min-w-12 items-center justify-center rounded-full"
      >
        <Feather name="chevron-left" size={24} color={colors.text} />
      </AppPressable>
      <View className="ml-1 flex-1">
        <Text
          numberOfLines={1}
          className="text-base font-semibold text-zinc-900 dark:text-zinc-100"
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            numberOfLines={1}
            className="text-xs text-zinc-500 dark:text-zinc-400"
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action ? <View className="ml-2">{action}</View> : null}
    </View>
  );
}
