import { useEffect } from 'react';
import { Feather } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useColors } from '../theme/colors';
import { AppPressable } from './AppPressable';

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  action,
  titleVisible = true,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
  action?: ReactNode;
  /** Keep false until the content scrolls past its hero title. */
  titleVisible?: boolean;
}) {
  const colors = useColors();
  const titleOpacity = useSharedValue(titleVisible ? 1 : 0);

  useEffect(() => {
    titleOpacity.value = withTiming(titleVisible ? 1 : 0, { duration: 150 });
  }, [titleOpacity, titleVisible]);

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
  }));

  return (
    <View className="flex-row items-center px-2 py-2">
      <AppPressable
        onPress={onBack}
        accessibilityLabel="Volver"
        hitSlop={8}
        className="min-h-12 min-w-12 items-center justify-center rounded-lg"
      >
        <Feather name="chevron-left" size={24} color={colors.text} />
      </AppPressable>
      <Animated.View
        style={titleStyle}
        className="ml-1 flex-1"
        importantForAccessibility={titleVisible ? 'auto' : 'no-hide-descendants'}
      >
        <Text
          numberOfLines={1}
          className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            numberOfLines={1}
            className="text-xs text-zinc-500 dark:text-zinc-400"
          >
            {subtitle}
          </Text>
        ) : null}
      </Animated.View>
      {action ? <View className="ml-2">{action}</View> : null}
    </View>
  );
}
