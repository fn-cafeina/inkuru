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
import { APP_BAR_GAP } from '../theme/spacing';
import { AppPressable } from './AppPressable';

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  action,
  titleVisible = true,
  tone = 'auto',
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
  action?: ReactNode;
  /** Keep false until the content scrolls past its hero title. */
  titleVisible?: boolean;
  tone?: 'auto' | 'dark';
}) {
  const colors = useColors();
  const textColor = tone === 'dark' ? '#f4f4f5' : colors.text;
  const mutedColor = tone === 'dark' ? '#a1a1aa' : colors.textMuted;
  const titleOpacity = useSharedValue(titleVisible ? 1 : 0);

  useEffect(() => {
    titleOpacity.value = withTiming(titleVisible ? 1 : 0, { duration: 150 });
  }, [titleOpacity, titleVisible]);

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
  }));

  return (
    <View
      className="flex-row items-center px-2 py-1"
      style={{ marginBottom: APP_BAR_GAP }}
    >
      <AppPressable
        onPress={onBack}
        accessibilityLabel="Volver"
        hitSlop={8}
        className="min-h-12 min-w-12 items-center justify-center rounded-full"
      >
        <Feather name="chevron-left" size={24} color={textColor} />
      </AppPressable>
      <Animated.View
        style={titleStyle}
        className="ml-1 flex-1"
        importantForAccessibility={titleVisible ? 'auto' : 'no-hide-descendants'}
      >
        <Text
          numberOfLines={1}
          className="text-base font-semibold"
          style={{ color: textColor }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            numberOfLines={1}
            className="text-xs"
            style={{ color: mutedColor }}
          >
            {subtitle}
          </Text>
        ) : null}
      </Animated.View>
      {action ? <View className="ml-2">{action}</View> : null}
    </View>
  );
}
