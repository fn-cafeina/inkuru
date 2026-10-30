import { Text } from 'react-native';

import { AppPressable } from './AppPressable';
import { useColors } from '../theme/colors';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'lg';
type Tone = 'auto' | 'dark';

const LABELS: Record<Variant, string> = {
  primary: 'text-sm font-semibold',
  secondary: 'text-sm font-medium',
  ghost: 'text-sm font-medium',
};

const SIZES: Record<Size, string> = {
  sm: 'min-h-12 px-4',
  lg: 'min-h-14 px-4',
};

export function Button({
  variant = 'primary',
  size = 'sm',
  tone = 'auto',
  onPress,
  children,
}: {
  variant?: Variant;
  size?: Size;
  tone?: Tone;
  onPress: () => void;
  children: string;
}) {
  const colors = useColors();
  const onDark = tone === 'dark';
  const textColor =
    variant === 'primary'
      ? colors.onAccent
      : onDark
        ? variant === 'secondary'
          ? '#e4e4e7'
          : '#a1a1aa'
        : variant === 'secondary'
          ? colors.text
          : colors.textMuted;
  const containerStyle =
    variant === 'primary'
      ? { backgroundColor: colors.accent }
      : variant === 'secondary'
        ? { borderColor: onDark ? '#3f3f46' : colors.border }
        : undefined;

  return (
    <AppPressable
      onPress={onPress}
      style={containerStyle}
      className={`items-center justify-center rounded-full ${
        variant === 'secondary' ? 'border' : ''
      } ${SIZES[size]}`}
    >
      <Text className={LABELS[variant]} style={{ color: textColor }}>
        {children}
      </Text>
    </AppPressable>
  );
}
