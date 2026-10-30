import { Text } from 'react-native';

export function SectionTitle({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <Text
      accessibilityRole="header"
      className={`text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 ${className ?? ''}`}
    >
      {children}
    </Text>
  );
}
