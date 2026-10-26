import type { ComponentProps } from 'react';
import { Pressable } from 'react-native';

import { useColors } from '../theme/colors';

type Props = ComponentProps<typeof Pressable>;

/** Pressable with Android ripple and a default button role. */
export function AppPressable({
  accessibilityRole = 'button',
  android_ripple,
  ...rest
}: Props) {
  const colors = useColors();

  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      android_ripple={android_ripple ?? { color: colors.ripple }}
      {...rest}
    />
  );
}
