import { useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { Button } from '../../components/Button';
import { PageTitle } from '../../components/PageTitle';
import { Screen } from '../../components/Screen';
import { SettingSection } from '../../components/SettingSection';
import { useColors } from '../../theme/colors';
import {
  checkForUpdate,
  currentVersion,
  getUpdateState,
  subscribeUpdates,
} from '../../update/check';
import { downloadApk, installApk } from '../../update/install';

export default function SettingsScreen() {
  const colors = useColors();
  const update = useSyncExternalStore(subscribeUpdates, getUpdateState);
  const [downloading, setDownloading] = useState(false);
  const [installFailed, setInstallFailed] = useState(false);

  const status =
    update.available !== null
      ? `${update.available.tag} disponible`
      : update.checking
        ? 'Comprobando…'
        : update.failed
          ? 'Sin comprobar ahora mismo'
          : 'Estás en la última versión';

  async function install(): Promise<void> {
    const release = update.available;

    if (release === null || downloading) {
      return;
    }

    setDownloading(true);
    setInstallFailed(false);

    try {
      const apk = await downloadApk(release.apkUrl);
      await installApk(apk);
    } catch {
      setInstallFailed(true);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Screen>
      <PageTitle>Ajustes</PageTitle>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-4 pb-8"
      >
        <SettingSection title="Aplicación" className="mt-0">
          <InfoRow label="Versión" value={currentVersion()} />
          <InfoRow label="Actualizaciones" value={status} divider />
        </SettingSection>

        {update.available !== null ? (
          <SettingSection title="Actualización disponible">
            <View className="gap-3 px-4 py-4">
              <Text className="text-base text-zinc-700 dark:text-zinc-300">
                {`Inkuru ${update.available.tag} está lista para instalar.`}
              </Text>
              <Button size="lg" disabled={downloading} onPress={() => void install()}>
                {downloading ? 'Descargando…' : 'Actualizar'}
              </Button>
              {installFailed ? (
                <Text className="text-sm text-red-600 dark:text-red-400">
                  No se pudo descargar. Revisa la conexión e inténtalo otra vez.
                </Text>
              ) : null}
            </View>
          </SettingSection>
        ) : (
          <SettingSection title="Comprobación" className="mt-4">
            <View className="items-start gap-3 px-4 py-4">
              {update.checking ? (
                <ActivityIndicator color={colors.iconInactive} />
              ) : (
                <Button
                  variant="secondary"
                  onPress={() => void checkForUpdate(true)}
                >
                  Comprobar ahora
                </Button>
              )}
              {update.failed ? (
                <Text className="text-sm text-zinc-500 dark:text-zinc-400">
                  No se pudo comprobar si hay una versión nueva.
                </Text>
              ) : null}
            </View>
          </SettingSection>
        )}
      </ScrollView>
    </Screen>
  );
}

function InfoRow({
  label,
  value,
  divider = false,
}: {
  label: string;
  value: string;
  divider?: boolean;
}) {
  return (
    <View className="min-h-14 flex-row items-center justify-between px-4 py-2">
      {divider ? (
        <View className="absolute left-4 right-0 top-0 h-px bg-zinc-200 dark:bg-zinc-800" />
      ) : null}
      <Text className="text-base text-zinc-500 dark:text-zinc-400">{label}</Text>
      <Text
        accessibilityLabel={`${label}: ${value}`}
        className="ml-4 text-base text-zinc-900 dark:text-zinc-100"
      >
        {value}
      </Text>
    </View>
  );
}