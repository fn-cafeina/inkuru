import { Text, View } from 'react-native';

export function PageTitle({ children }: { children: string }) {
  return (
    <View className="mb-2 h-14 justify-center px-4">
      <Text
        accessibilityRole="header"
        className="text-xl font-semibold text-zinc-900 dark:text-zinc-50"
      >
        {children}
      </Text>
    </View>
  );
}
