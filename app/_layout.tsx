import '../global.css';

import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router/stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from 'react-native-safe-area-context';

import { UpdateFlowSheet } from '@/screens/settings/components/UpdateFlowSheet';
import { watchStalls } from '@/dev/stall';
import { initializeDownloads, setDownloadConcurrency } from '@/downloads/manager';
import { loadDownloadConcurrency } from '@/storage/downloadSettings';
import { useColors } from '@/theme/colors';
import { checkForUpdate } from '@/update/check';
import { initFlow } from '@/update/flow';
import { cleanupOldApk } from '@/update/install';
import { sweepPageMarks } from '@/storage/readerProgress';

export default function RootLayout() {
  const colors = useColors();

  useEffect(() => {
    watchStalls();
    // The tab dot replaces the old launch alert as the update announcement.
    void initFlow();
    void checkForUpdate();
    cleanupOldApk();
    // One key per chapter ever opened; the sweep keeps the newest few hundred.
    void sweepPageMarks();
    // The disk scan moves to launch so opening a manga never pays for it.
    void initializeDownloads();
    void loadDownloadConcurrency().then(setDownloadConcurrency);
  }, []);

  return (
    <GestureHandlerRootView
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
          <Stack.Screen name="manga" />
          <Stack.Screen
            name="reader"
            options={{ animation: 'fade', statusBarHidden: true }}
          />
        </Stack>
        <UpdateFlowSheet />
        <StatusBar style="light" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
