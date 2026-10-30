import { Feather } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useEffect, useState } from 'react';
import { Animated, Keyboard, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppPressable } from '../components/AppPressable';
import DiscoverScreen from '../screens/DiscoverScreen';
import LibraryScreen from '../screens/LibraryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { useColors } from '../theme/colors';
import { CARD } from '../theme/styles';
import {
  TabBarVisibilityProvider,
  TAB_BAR_HEIGHT,
  useTabBarVisibility,
} from './tabBar';
import type { MainTabsParamList } from './types';

const renderTabBar = (props: BottomTabBarProps) => <FloatingTabBar {...props} />;

const Tab = createBottomTabNavigator<MainTabsParamList>();

const ICONS = {
  Library: 'book-open',
  Discover: 'compass',
  Settings: 'settings',
} as const;

export function MainTabs() {
  return (
    <TabBarVisibilityProvider>
      <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={renderTabBar}>
        <Tab.Screen
          name="Library"
          component={LibraryScreen}
          options={{ title: 'Biblioteca' }}
        />
        <Tab.Screen
          name="Discover"
          component={DiscoverScreen}
          options={{ title: 'Explorar' }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: 'Ajustes' }}
        />
      </Tab.Navigator>
    </TabBarVisibilityProvider>
  );
}

function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { hidden, hideOffset, resetY, show } = useTabBarVisibility();
  const [keyboardOffset] = useState(() => new Animated.Value(0));

  // The bar sits at the bottom of the screen, so the keyboard covers it.
  useEffect(() => {
    const animateTo = (toValue: number) =>
      Animated.timing(keyboardOffset, {
        toValue,
        duration: 180,
        useNativeDriver: true,
      }).start();

    const onShow = Keyboard.addListener('keyboardDidShow', (event) =>
      animateTo(event.endCoordinates.height),
    );
    const onHide = Keyboard.addListener('keyboardDidHide', () => animateTo(0));

    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, [keyboardOffset]);

  useEffect(() => {
    show();
    resetY();
  }, [show, resetY, state.index]);

  const translateY = Animated.add(
    hidden.interpolate({
      inputRange: [0, 1],
      outputRange: [0, hideOffset],
    }),
    keyboardOffset,
  );

  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: insets.bottom + 12,
        alignItems: 'center',
        transform: [{ translateY }],
      }}
    >
      <View className={`flex-row rounded-xl p-1.5 ${CARD}`}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;

          return (
            <AppPressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={
                descriptors[route.key]?.options.title ?? route.name
              }
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name, route.params);
                }
              }}
              hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
              className={
                focused
                  ? 'items-center justify-center rounded-md bg-accent-500 px-6'
                  : 'items-center justify-center rounded-md px-6'
              }
              style={{ height: TAB_BAR_HEIGHT - 12 }}
            >
              <Feather
                name={ICONS[route.name as keyof typeof ICONS]}
                size={20}
                color={focused ? colors.onAccent : colors.iconInactive}
              />
            </AppPressable>
          );
        })}
      </View>
    </Animated.View>
  );
}
