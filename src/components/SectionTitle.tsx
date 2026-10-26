import { Text } from 'react-native';

export function SectionTitle({ children }: { children: string }) {
  return (
    <Text
      accessibilityRole="header"
      className="mb-3 px-4 text-base font-semibold text-zinc-900 dark:text-zinc-100"
    >
      {children}
    </Text>
  );
}
