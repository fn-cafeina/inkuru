import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useColorScheme } from 'react-native';

import MangaScreen from '../screens/MangaScreen';
import ReaderScreen from '../screens/ReaderScreen';
import { useColors } from '../theme/colors';
import { MainTabs } from './Tabs';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const scheme = useColorScheme();
  const colors = useColors();
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;

  return (
    <NavigationContainer
      theme={{
        ...base,
        colors: {
          ...base.colors,
          primary: colors.primary,
          background: colors.background,
          card: colors.surface,
          text: colors.text,
          border: colors.border,
          notification: colors.notification,
        },
      }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Tabs" component={MainTabs} />
        <Stack.Screen name="Manga" component={MangaScreen} />
        <Stack.Screen name="Reader" component={ReaderScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
