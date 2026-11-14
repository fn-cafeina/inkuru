import { Text } from 'react-native';

import { AnimatedPressable } from './AnimatedPressable';
import { reader, useColors } from '../theme/colors';

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

/** Primary reads on accent, the other variants on the page background. */
function textColorFor(
  variant: Variant,
  onDark: boolean,
  colors: ReturnType<typeof useColors>,
): string {
  if (variant === 'primary') {
    return colors.onAccent;
  }

  if (onDark) {
    return variant === 'secondary' ? reader.text : reader.textMuted;
  }

  return variant === 'secondary' ? colors.text : colors.textMuted;
}

function containerStyleFor(
  variant: Variant,
  onDark: boolean,
  colors: ReturnType<typeof useColors>,
) {
  if (variant === 'primary') {
    return { backgroundColor: colors.accent };
  }

  return variant === 'secondary'
    ? { borderColor: onDark ? reader.border : colors.border }
    : undefined;
}

export function Button({
  variant = 'primary',
  size = 'sm',
  tone = 'auto',
  disabled = false,
  busy = false,
  onPress,
  children,
}: {
  variant?: Variant;
  size?: Size;
  tone?: Tone;
  disabled?: boolean;
  /**
   * Not pressable, but still fully legible: a disabled look on a label that
   * carries live progress ("Descargando 47%") hides the only feedback there is.
   */
  busy?: boolean;
  onPress: () => void;
  children: string;
}) {
  const colors = useColors();
  const onDark = tone === 'dark';
  const textColor = textColorFor(variant, onDark, colors);
  const containerStyle = containerStyleFor(variant, onDark, colors);

  return (
    <AnimatedPressable
      accessibilityState={{ disabled: disabled || busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={containerStyle}
      className={`items-center justify-center rounded-xl ${
        variant === 'secondary' ? 'border' : ''
      } ${SIZES[size]} ${disabled ? 'opacity-40' : ''}`}
    >
      <Text className={LABELS[variant]} style={{ color: textColor }}>
        {children}
      </Text>
    </AnimatedPressable>
  );
}
