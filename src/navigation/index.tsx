import {
  DarkTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import MangaScreen from '../screens/manga/MangaScreen';
import ReaderScreen from '../screens/reader/ReaderScreen';
import { useColors } from '../theme/colors';
import { MainTabs } from './Tabs';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const colors = useColors();
  const base = DarkTheme;

  return (
    <NavigationContainer
      theme={{
        ...base,
        colors: {
          ...base.colors,
          primary: colors.accent,
          background: colors.background,
          card: colors.surface,
          text: colors.text,
          border: colors.border,
          notification: colors.notification,
        },
      }}
    >
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen
          name="Tabs"
          component={MainTabs}
          options={{ animation: 'none' }}
        />
        <Stack.Screen name="Manga" component={MangaScreen} />
        <Stack.Screen
          name="Reader"
          component={ReaderScreen}
          options={{ animation: 'fade', statusBarHidden: true }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
