import type { ComponentProps } from 'react';
import { Pressable } from 'react-native';

import { useColors } from '../theme/colors';

type Props = ComponentProps<typeof Pressable> & {
  /** Ripple outside the pressable bounds; for circular icon buttons. */
  borderlessRipple?: boolean;
};

/** Pressable with Android ripple and a default button role. */
export function AppPressable({
  accessibilityRole = 'button',
  android_ripple,
  borderlessRipple,
  ...rest
}: Props) {
  const colors = useColors();

  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      android_ripple={
        android_ripple ?? { color: colors.ripple, borderless: borderlessRipple }
      }
      {...rest}
    />
  );
}
