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
    <View className="flex-1 items-center justify-center px-5">
      <Text className="text-center text-base font-semibold text-white">
        {title}
      </Text>
      {subtitle ? (
        <Text
          className="mt-1.5 text-center text-sm text-neutral-400"
        >
          {subtitle}
        </Text>
      ) : null}
      {action ? <View className="mt-5">{action}</View> : null}
    </View>
  );
}
