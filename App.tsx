import './global.css';

import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from 'react-native-safe-area-context';

import { UpdateFlowSheet } from './src/screens/settings/components/UpdateFlowSheet';
import { RootNavigator } from './src/navigation';
import { useColors } from './src/theme/colors';
import { checkForUpdate } from './src/update/check';
import { initFlow } from './src/update/flow';
import { cleanupOldApk } from './src/update/install';

export default function App() {
  const colors = useColors();

  useEffect(() => {
    // The tab dot replaces the old launch alert as the update announcement.
    void initFlow();
    void checkForUpdate();
    cleanupOldApk();
  }, []);

  return (
    <GestureHandlerRootView
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <RootNavigator />
        <UpdateFlowSheet />
        <StatusBar style="light" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
