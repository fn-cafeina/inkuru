import { Tabs } from 'expo-router/js-tabs';
import type { BottomTabBarProps } from 'expo-router/js-tabs';

import { FloatingTabBar } from '@/navigation/FloatingTabBar';
import { useColors } from '@/theme/colors';

// The navigator calls `tabBar` as a plain function inside a context render
// prop, where the hook dispatcher is not set; `FloatingTabBar` must render
// as an element with its own fiber for its hooks to run.
function TabBar(props: BottomTabBarProps) {
  return <FloatingTabBar {...props} />;
}

export default function TabsLayout() {
  const colors = useColors();

  return (
    <Tabs
      tabBar={TabBar}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Biblioteca' }} />
      <Tabs.Screen name="discover" options={{ title: 'Explorar' }} />
      <Tabs.Screen name="settings" options={{ title: 'Ajustes' }} />
    </Tabs>
  );
}
