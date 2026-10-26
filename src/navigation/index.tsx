import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useColorScheme } from 'react-native';

import MangaScreen from '../screens/MangaScreen';
import ReaderScreen from '../screens/ReaderScreen';
import { HomeTabs } from './Tabs';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const scheme = useColorScheme();

  return (
    <NavigationContainer theme={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Tabs" component={HomeTabs} />
        <Stack.Screen name="Manga" component={MangaScreen} />
        <Stack.Screen name="Reader" component={ReaderScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
