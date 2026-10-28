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
      className={`text-sm font-medium text-zinc-900 dark:text-zinc-100 ${className ?? ''}`}
    >
      {children}
    </Text>
  );
}
