import { Text, View } from 'react-native';

import { AppPressable } from './AppPressable';

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <Text className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        {message}
      </Text>
      <AppPressable
        onPress={onRetry}
        className="mt-6 min-h-12 items-center justify-center rounded-lg bg-zinc-900 px-5 dark:bg-zinc-100"
      >
        <Text className="text-sm font-semibold text-white dark:text-zinc-900">
          Reintentar
        </Text>
      </AppPressable>
    </View>
  );
}
