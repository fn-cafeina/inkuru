import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

export function EmptyState({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <Text className="text-center text-base font-semibold text-zinc-900 dark:text-zinc-50">
        {title}
      </Text>
      {subtitle ? (
        <Text className="mt-2 text-center text-sm text-zinc-500 dark:text-zinc-400">
          {subtitle}
        </Text>
      ) : null}
      {action ? <View className="mt-6">{action}</View> : null}
    </View>
  );
}
