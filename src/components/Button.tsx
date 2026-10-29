import { Text } from 'react-native';

import { AppPressable } from './AppPressable';
import { useColors } from '../theme/colors';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'lg';

const VARIANTS: Record<Variant, { container: string; label: string }> = {
  primary: {
    container: 'bg-accent-500',
    label: 'text-sm font-semibold',
  },
  secondary: {
    container: 'border border-zinc-200 dark:border-zinc-800',
    label: 'text-sm font-medium text-zinc-700 dark:text-zinc-300',
  },
  ghost: {
    container: '',
    label: 'text-sm font-medium text-zinc-500 dark:text-zinc-400',
  },
};

const SIZES: Record<Size, string> = {
  sm: 'min-h-12 px-5',
  lg: 'min-h-14 px-5',
};

export function Button({
  variant = 'primary',
  size = 'sm',
  onPress,
  children,
}: {
  variant?: Variant;
  size?: Size;
  onPress: () => void;
  children: string;
}) {
  const colors = useColors();
  const styles = VARIANTS[variant];

  return (
    <AppPressable
      onPress={onPress}
      className={`items-center justify-center rounded-lg ${styles.container} ${SIZES[size]}`}
    >
      <Text
        className={styles.label}
        style={variant === 'primary' ? { color: colors.onAccent } : undefined}
      >
        {children}
      </Text>
    </AppPressable>
  );
}
