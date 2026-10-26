import { Feather } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useEffect, useState } from 'react';
import {
  Animated,
  Keyboard,
  useColorScheme,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppPressable } from '../components/AppPressable';
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import {
  TabBarVisibilityProvider,
  TAB_BAR_HEIGHT,
  useTabBarVisibility,
} from './tabBar';
import type { HomeTabsParamList } from './types';

const renderTabBar = (props: BottomTabBarProps) => <FloatingTabBar {...props} />;

const Tab = createBottomTabNavigator<HomeTabsParamList>();

const ICONS = { Home: 'home', Search: 'search' } as const;

export function HomeTabs() {
  return (
    <TabBarVisibilityProvider>
      <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={renderTabBar}>
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'Inicio' }}
        />
        <Tab.Screen
          name="Search"
          component={SearchScreen}
          options={{ title: 'Buscar' }}
        />
      </Tab.Navigator>
    </TabBarVisibilityProvider>
  );
}

function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const { hidden, hideOffset, show } = useTabBarVisibility();
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // The bar sits at the bottom of the screen, so the keyboard covers it.
  useEffect(() => {
    const onShow = Keyboard.addListener('keyboardDidShow', (event) =>
      setKeyboardHeight(event.endCoordinates.height),
    );
    const onHide = Keyboard.addListener('keyboardDidHide', () =>
      setKeyboardHeight(0),
    );

    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

  useEffect(show, [show, state.index]);

  const activeIconColor = isDark ? '#18181b' : '#fafafa';
  const inactiveIconColor = isDark ? '#71717a' : '#a1a1aa';

  const translateY = Animated.add(
    hidden.interpolate({
      inputRange: [0, 1],
      outputRange: [0, hideOffset],
    }),
    keyboardHeight,
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
      <View className="flex-row rounded-full border border-zinc-200 bg-white p-1.5 dark:border-zinc-800 dark:bg-zinc-900">
        {state.routes.map((route, index) => {
          const focused = state.index === index;

          return (
            <AppPressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={
                descriptors[route.key].options.title ?? route.name
              }
              onPress={() => navigation.navigate(route.name, route.params)}
              className={
                focused
                  ? 'items-center justify-center rounded-full bg-zinc-900 px-6 dark:bg-zinc-100'
                  : 'items-center justify-center rounded-full px-6'
              }
              style={{ height: TAB_BAR_HEIGHT - 12 }}
            >
              <Feather
                name={ICONS[route.name as keyof typeof ICONS]}
                size={20}
                color={focused ? activeIconColor : inactiveIconColor}
              />
            </AppPressable>
          );
        })}
      </View>
    </Animated.View>
  );
}
