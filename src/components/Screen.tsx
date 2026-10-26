import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function Screen({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-zinc-50 dark:bg-zinc-950">
      <View style={{ height: insets.top }} />
      {children}
    </View>
  );
}
