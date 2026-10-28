import type { ComponentProps } from 'react';
import { Pressable, View } from 'react-native';

import { useColors } from '../theme/colors';

type Props = ComponentProps<typeof Pressable> & {
  /** Set false for full-screen backdrops that should not show a press tint. */
  pressFeedback?: boolean;
};

/** Pressable whose pressed tint follows its rounded shape. */
export function AppPressable({
  accessibilityRole = 'button',
  pressFeedback = true,
  className,
  children,
  ...rest
}: Props) {
  const colors = useColors();

  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      className={`overflow-hidden ${className ?? ''}`}
      {...rest}
    >
      {({ pressed }) => (
        <>
          {typeof children === 'function' ? children({ pressed }) : children}
          {pressFeedback && pressed ? (
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
