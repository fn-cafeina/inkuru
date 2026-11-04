import type { ReactNode } from 'react';
import { useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { AppPressable } from '../../components/AppPressable';
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

  const status = update.checking
    ? 'Comprobando…'
    : update.available !== null
      ? `${update.available.tag} disponible`
      : update.failed
        ? 'Sin comprobar'
        : 'Al día';

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
        <SettingSection title="Aplicación" className="mt-2">
          <InfoRow label="Versión" value={currentVersion()} />
        </SettingSection>

        <SettingSection title="Actualizaciones">
          <InfoRow
            label="Estado"
            value={status}
            disabled={update.checking}
            trailing={
              update.checking ? (
                <ActivityIndicator size="small" color={colors.iconInactive} />
              ) : undefined
            }
            onPress={() => void checkForUpdate(true)}
          />
          {update.available !== null ? (
            <View
              className="gap-3 px-4 py-4"
              style={{ backgroundColor: colors.accentContainer }}
            >
              <Text
                className="text-base font-medium"
                style={{ color: colors.onAccentContainer }}
              >
                {`Inkuru ${update.available.tag} está lista para instalar.`}
              </Text>
              <Button
                size="lg"
                disabled={downloading}
                onPress={() => void install()}
              >
                {downloading ? 'Descargando…' : 'Actualizar'}
              </Button>
              {installFailed ? (
                <Text
                  className="text-sm"
                  style={{ color: colors.onAccentContainer }}
                >
                  No se pudo descargar. Inténtalo otra vez.
                </Text>
              ) : null}
            </View>
          ) : null}
        </SettingSection>
      </ScrollView>
    </Screen>
  );
}

function InfoRow({
  label,
  value,
  trailing,
  disabled = false,
  onPress,
}: {
  label: string;
  value: string;
  trailing?: ReactNode;
  disabled?: boolean;
  onPress?: () => void;
}) {
  const className = 'min-h-14 flex-row items-center px-4';
  const content = (
    <>
      <Text className="flex-1 text-base text-zinc-900 dark:text-zinc-100">
        {label}
      </Text>
      <Text className="text-sm text-zinc-500 dark:text-zinc-400">{value}</Text>
      {trailing ? <View className="ml-2">{trailing}</View> : null}
    </>
  );

  if (onPress === undefined) {
    return <View className={className}>{content}</View>;
  }

  return (
    <AppPressable
      accessibilityLabel={`${label}: ${value}`}
      disabled={disabled}
      onPress={onPress}
      className={className}
    >
      {content}
    </AppPressable>
  );
}