import { Text } from 'react-native';

export function SectionTitle({ children }: { children: string }) {
  return (
    <Text
      accessibilityRole="header"
      className="mb-3 mt-7 px-4 text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400"
    >
      {children}
    </Text>
  );
}
