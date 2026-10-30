import type { ComponentProps } from 'react';
import { Platform, Pressable, View } from 'react-native';

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
  const ripple =
    pressFeedback && Platform.OS === 'android'
      ? { color: colors.ripple }
      : undefined;

  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      android_ripple={ripple}
      className={`overflow-hidden ${className ?? ''}`}
      {...rest}
    >
      {({ pressed }) => (
        <>
          {typeof children === 'function' ? children({ pressed }) : children}
          {pressFeedback && Platform.OS !== 'android' && pressed ? (
            <View
              pointerEvents="none"
              className="absolute inset-0"
              style={{ backgroundColor: colors.ripple }}
            />
          ) : null}
        </>
      )}
    </Pressable>
  );
}
