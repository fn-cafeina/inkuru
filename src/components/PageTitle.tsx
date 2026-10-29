import { Text, View } from 'react-native';

export function PageTitle({ children }: { children: string }) {
  return (
    <View className="px-4 pb-4 pt-3">
      <Text
        accessibilityRole="header"
        className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50"
      >
        {children}
      </Text>
    </View>
  );
}
