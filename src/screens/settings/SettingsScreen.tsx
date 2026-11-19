import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Screen } from '../../components/Screen';
import { CounterRow } from '../../components/CounterRow';
import { SettingRow } from '../../components/SettingRow';
import { SettingSection } from '../../components/SettingSection';
import { SwitchRow } from '../../components/SwitchRow';
import { setDownloadConcurrency } from '../../downloads/manager';
import { useTabBarManager } from '../../hooks/useTabBarManager';
import { TAB_BAR_CLEARANCE } from '../../navigation/FloatingTabBar';
import {
  DEFAULT_DOWNLOAD_CONCURRENCY,
  loadDownloadConcurrency,
  MAX_DOWNLOAD_CONCURRENCY,
  MIN_DOWNLOAD_CONCURRENCY,
  saveDownloadConcurrency,
} from '../../storage/downloadSettings';
import { useColors } from '../../theme/colors';
import {
  checkForUpdate,
  currentVersion,
  getUpdateState,
  setAutoCheck,
  subscribeUpdates,
} from '../../update/check';
import { openUpdate } from '../../update/flow';

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { handleScroll, reset } = useTabBarManager();
  const update = useSyncExternalStore(subscribeUpdates, getUpdateState);
  const [concurrency, setConcurrency] = useState(DEFAULT_DOWNLOAD_CONCURRENCY);

  useEffect(() => {
    void loadDownloadConcurrency().then(setConcurrency);
  }, []);

  const changeConcurrency = (next: number) => {
    setConcurrency(next);
    setDownloadConcurrency(next);
    void saveDownloadConcurrency(next);
  };

  useEffect(() => {
    void checkForUpdate();
  }, []);

  useFocusEffect(
    useCallback(() => {
      reset();
    }, [reset]),
  );

  const release = update.available;
  const subtitle = update.checking
    ? 'Buscando...'
    : update.failure !== null
      ? update.failure
      : release !== null
        ? `${release.tag} disponible`
        : 'Estás al día';
  const subtitleColor = update.checking
    ? undefined
    : update.failure !== null
      ? colors.notification
      : colors.accent;

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: insets.bottom + TAB_BAR_CLEARANCE,
        }}
      >
        <SettingSection title="Actualizaciones" className="mt-0">
          <SwitchRow
            icon="bell"
            title="Buscar actualizaciones"
            subtitle="Al iniciar la app"
            value={update.autoCheck}
            onValueChange={(value) => void setAutoCheck(value)}
          />
          <SettingRow
            icon="download"
            iconColor={colors.accent}
            title="Buscar actualización"
            subtitle={subtitle}
            subtitleColor={subtitleColor}
            divider
            disabled={update.checking}
            onPress={release !== null ? openUpdate : () => void checkForUpdate(true)}
            trailing={
              release !== null && !update.checking ? (
                <View className="ml-1 flex-row items-center gap-0.5">
                  <Text
                    className="text-xs font-semibold tracking-wide"
                    style={{ color: colors.accent }}
                  >
                    Actualizar
                  </Text>
                  <Feather name="arrow-right" size={11} color={colors.accent} />
                </View>
              ) : null
            }
          />
        </SettingSection>

        <SettingSection title="Descargas">
          <CounterRow
            icon="layers"
            title="Simultáneas"
            subtitle="Capítulos a la vez"
            accessibilityLabel="descargas simultáneas"
            value={concurrency}
            min={MIN_DOWNLOAD_CONCURRENCY}
            max={MAX_DOWNLOAD_CONCURRENCY}
            onChange={changeConcurrency}
          />
        </SettingSection>

        <SettingSection title="Acerca de">
          <SettingRow
            icon="info"
            title={`Versión ${currentVersion()}`}
            subtitle="Inkuru"
          />
        </SettingSection>
      </ScrollView>
    </Screen>
  );
}
