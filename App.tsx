import './global.css';

import { useEffect } from 'react';
import { Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from 'react-native-safe-area-context';

import { RootNavigator } from './src/navigation';
import { useColors } from './src/theme/colors';
import { checkForUpdate } from './src/update/check';

export default function App() {
  const colors = useColors();

  useEffect(() => {
    void checkForUpdate().then((result) => {
      if (result.available !== null) {
        Alert.alert(
          'Actualización disponible',
          `Inkuru ${result.available.tag} ya se puede instalar desde Ajustes.`,
        );
      }
    });
  }, []);

  return (
    <GestureHandlerRootView
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <RootNavigator />
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
