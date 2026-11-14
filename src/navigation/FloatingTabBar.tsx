import { Feather } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useEffect, useSyncExternalStore } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { AnimatedPressable } from '../components/AnimatedPressable';
import { useColors } from '../theme/colors';
import { getUpdateState, subscribeUpdates } from '../update/check';
import { useTabBarVisibility } from './tabBarState';
import type { MainTabsParamList } from './types';

// 16px gap under the pill + 60px pill (py-2 + 44px icon button).
export const TAB_BAR_CLEARANCE = 76;
const GAP_BELOW = 16;

const ICONS: Record<keyof MainTabsParamList, keyof typeof Feather.glyphMap> = {
  Library: 'book-open',
  Discover: 'compass',
  Settings: 'settings',
};

/**
 * Rokimu-style floating pill: absolutely positioned over the scenes, slides
 * away while scrolling, and dots the settings tab when an update is available.
 */
export function FloatingTabBar({
  state,
  descriptors,
  navigation,
  insets,
}: BottomTabBarProps) {
  const colors = useColors();
  const visible = useTabBarVisibility();
  const update = useSyncExternalStore(subscribeUpdates, getUpdateState);
  const hideDistance = insets.bottom + TAB_BAR_CLEARANCE;

  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withTiming(visible ? 0 : hideDistance, {
      duration: 250,
    });
  }, [visible, hideDistance, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: insets.bottom + GAP_BELOW,
          alignItems: 'center',
        },
        animatedStyle,
      ]}
    >
      <View
        className="flex-row items-center justify-center gap-4 rounded-xl px-4 py-2"
        style={{ backgroundColor: colors.surface, elevation: 8 }}
      >
        {state.routes.map((route, index) => {
          const descriptor = descriptors[route.key];

          if (descriptor === undefined) {
            return null;
          }

          const { options } = descriptor;
          const isFocused = state.index === index;
          const name = route.name as keyof MainTabsParamList;
          const color = isFocused ? colors.accent : colors.iconInactive;
          // The dot only means "the app found this"; with the auto-check off,
          // nothing found anything.
          const showUpdateDot =
            name === 'Settings' &&
            update.autoCheck &&
            update.available !== null;

          return (
            <AnimatedPressable
              key={route.key}
              accessibilityLabel={options.title}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(name);
                }
              }}
              className="h-11 w-11 items-center justify-center rounded-lg"
            >
              <View className="relative">
                <Feather name={ICONS[name]} size={20} color={color} />
                {showUpdateDot ? (
                  <View
                    className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: colors.accent }}
                  />
                ) : null}
              </View>
            </AnimatedPressable>
          );
        })}
      </View>
    </Animated.View>
  );
}
