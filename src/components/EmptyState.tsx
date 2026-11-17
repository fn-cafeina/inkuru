import { Feather } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { useColors } from '../theme/colors';

export function EmptyState({
  title,
  subtitle,
  action,
  icon = 'frown',
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  icon?: keyof typeof Feather.glyphMap;
}) {
  const colors = useColors();

  return (
    <View className="flex-1 items-center justify-center px-5">
      <Feather name={icon} size={48} color={colors.iconInactive} />
      <Text className="mt-4 text-center text-sm font-semibold text-neutral-500">
        {title}
      </Text>
      {subtitle ? (
        <Text className="mt-2 max-w-[300px] text-center text-xs text-neutral-600">
          {subtitle}
        </Text>
      ) : null}
      {action ? <View className="mt-4">{action}</View> : null}
    </View>
  );
}
