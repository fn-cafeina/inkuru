import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PageTitle } from '../../components/PageTitle';
import { Screen } from '../../components/Screen';
import { SettingRow } from '../../components/SettingRow';
import { SettingSection } from '../../components/SettingSection';
import { SwitchRow } from '../../components/SwitchRow';
import { useTabBarManager } from '../../hooks/useTabBarManager';
import { TAB_BAR_CLEARANCE } from '../../navigation/FloatingTabBar';
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
    ? 'Comprobando...'
    : update.failure !== null
      ? update.failure
      : release !== null
        ? `${release.tag} disponible`
        : 'Al día';
  const subtitleColor = update.checking
    ? undefined
    : update.failure !== null
      ? colors.notification
      : colors.accent;

  return (
    <Screen>
      <PageTitle>Ajustes</PageTitle>
      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + TAB_BAR_CLEARANCE,
        }}
      >
        <SettingSection title="Actualizaciones" className="mt-2">
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
