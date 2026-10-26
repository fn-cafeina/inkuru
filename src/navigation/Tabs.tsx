import { Feather } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import type { HomeTabsParamList } from './types';

const renderTabBar = (props: BottomTabBarProps) => <FloatingTabBar {...props} />;

const Tab = createBottomTabNavigator<HomeTabsParamList>();

const ICONS = { Home: 'home', Search: 'search' } as const;

export function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false, tabBarHideOnKeyboard: true }}
      tabBar={renderTabBar}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Inicio' }} />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{ title: 'Buscar' }}
      />
    </Tab.Navigator>
  );
}

function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const activeIconColor = isDark ? '#18181b' : '#fafafa';
  const inactiveIconColor = isDark ? '#71717a' : '#a1a1aa';

  return (
    <View
      className="bg-zinc-50 px-4 dark:bg-zinc-950"
      style={{ paddingBottom: insets.bottom + 12 }}
    >
      <View
        className="flex-row rounded-full border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
        style={{ elevation: 6 }}
      >
        {state.routes.map((route, index) => {
          const focused = state.index === index;

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={
                descriptors[route.key].options.title ?? route.name
              }
              onPress={() => navigation.navigate(route.name, route.params)}
              className="flex-1 items-center py-2"
            >
              <View
                className={
                  focused
                    ? 'rounded-full bg-zinc-900 px-5 py-2 dark:bg-zinc-100'
                    : 'px-5 py-2'
                }
              >
                <Feather
                  name={ICONS[route.name as keyof typeof ICONS]}
                  size={20}
                  color={focused ? activeIconColor : inactiveIconColor}
                />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
