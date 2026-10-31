import type { ComponentProps } from 'react';
import { Pressable } from 'react-native';

import { useColors } from '../theme/colors';

type Props = ComponentProps<typeof Pressable> & {
  /** Set false for full-screen backdrops that should not show a press tint. */
  pressFeedback?: boolean;
};

/** Pressable whose ripple follows its rounded shape. */
export function AppPressable({
  accessibilityRole = 'button',
  pressFeedback = true,
  className,
  children,
  ...rest
}: Props) {
  const colors = useColors();
  const ripple = pressFeedback ? { color: colors.ripple } : undefined;

  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      android_ripple={ripple}
      className={`overflow-hidden ${className ?? ''}`}
      {...rest}
    >
      {({ pressed }) =>
        typeof children === 'function' ? children({ pressed }) : children
      }
    </Pressable>
  );
}
