import { useCallback, useRef } from 'react';
import type {
  ComponentPropsWithoutRef,
  ReactNode,
} from 'react';
import type {
  GestureResponderEvent,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const AnimatedPressableComponent = Animated.createAnimatedComponent(Pressable);
const DEFAULT_DEBOUNCE_MS = 300;

type Props = Omit<ComponentPropsWithoutRef<typeof Pressable>, 'style'> & {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Ignores repeat presses within this window; guards double-tap bugs. */
  debounceMs?: number;
  /** Optional light impact on press, matching rokimu's cards and settings. */
  hapticFeedback?: boolean;
};

/** Pressable with rokimu's press feel: shrink and fade instead of a ripple. */
export function AnimatedPressable({
  children,
  style,
  onPressIn,
  onPressOut,
  onPress,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  hapticFeedback = false,
  ...rest
}: Props) {
  const lastPressTimeRef = useRef(0);

  const handlePress = useCallback(
    (event: GestureResponderEvent) => {
      const now = Date.now();

      if (now - lastPressTimeRef.current < debounceMs) {
        return;
      }

      lastPressTimeRef.current = now;
      if (hapticFeedback) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      onPress?.(event);
    },
    [onPress, debounceMs, hapticFeedback],
  );

  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  /* eslint-disable react-hooks/immutability -- Reanimated shared values are mutable boxes by design; the compiler cannot model them */
  const handlePressIn = useCallback(
    (event: GestureResponderEvent) => {
      scale.value = withTiming(0.96, { duration: 80 });
      opacity.value = withTiming(0.8, { duration: 80 });
      if (onPressIn) {
        onPressIn(event);
      }
    },
    [onPressIn, scale, opacity],
  );

  const handlePressOut = useCallback(
    (event: GestureResponderEvent) => {
      scale.value = withTiming(1, { duration: 120 });
      opacity.value = withTiming(1, { duration: 120 });
      if (onPressOut) {
        onPressOut(event);
      }
    },
    [onPressOut, scale, opacity],
  );
  /* eslint-enable react-hooks/immutability */

  return (
    <AnimatedPressableComponent
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      style={[style, animatedStyle]}
      accessibilityRole="button"
      {...rest}
    >
      {children}
    </AnimatedPressableComponent>
  );
}
