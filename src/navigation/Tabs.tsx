import { Feather } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import DiscoverScreen from '../screens/DiscoverScreen';
import LibraryScreen from '../screens/LibraryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { useColors } from '../theme/colors';
import type { MainTabsParamList } from './types';

const Tab = createBottomTabNavigator<MainTabsParamList>();

type IconProps = { color: string; size: number };

const LibraryIcon = ({ color, size }: IconProps) => (
  <Feather name="book-open" size={size} color={color} />
);

const DiscoverIcon = ({ color, size }: IconProps) => (
  <Feather name="compass" size={size} color={color} />
);

const SettingsIcon = ({ color, size }: IconProps) => (
  <Feather name="settings" size={size} color={color} />
);

export function MainTabs() {
  const colors = useColors();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.iconInactive,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '500' },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tab.Screen
        name="Library"
        component={LibraryScreen}
        options={{ title: 'Biblioteca', tabBarIcon: LibraryIcon }}
      />
      <Tab.Screen
        name="Discover"
        component={DiscoverScreen}
        options={{ title: 'Explorar', tabBarIcon: DiscoverIcon }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Ajustes', tabBarIcon: SettingsIcon }}
      />
    </Tab.Navigator>
  );
}
