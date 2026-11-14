import {
  createBottomTabNavigator,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';

import DiscoverScreen from '../screens/discover/DiscoverScreen';
import LibraryScreen from '../screens/library/LibraryScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import { useColors } from '../theme/colors';
import { FloatingTabBar } from './FloatingTabBar';
import type { MainTabsParamList } from './types';

const Tab = createBottomTabNavigator<MainTabsParamList>();

// The navigator calls `tabBar` as a plain function inside a context render
// prop, where the hook dispatcher is not set; `FloatingTabBar` must render
// as an element with its own fiber for its hooks to run.
function TabBar(props: BottomTabBarProps) {
  return <FloatingTabBar {...props} />;
}

export function MainTabs() {
  const colors = useColors();

  return (
    <Tab.Navigator
      tabBar={TabBar}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
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
  );
}
