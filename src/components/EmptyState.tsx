import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

export function EmptyState({
  title,
  subtitle,
  action,
  tone = 'auto',
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  tone?: 'auto' | 'dark';
}) {
  const dark = tone === 'dark';

  return (
    <View className="flex-1 items-center justify-center px-5">
      <Text
        className={`text-center text-base font-semibold ${
          dark ? 'text-zinc-100' : 'text-zinc-50'
        }`}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          className="mt-1.5 text-center text-sm text-zinc-400"
        >
          {subtitle}
        </Text>
      ) : null}
      {action ? <View className="mt-5">{action}</View> : null}
    </View>
  );
}
