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
      className={`text-sm font-semibold uppercase tracking-wide text-zinc-400 ${className ?? ''}`}
    >
      {children}
    </Text>
  );
}
