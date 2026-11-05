import type { ReactNode } from 'react';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

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
import type { UpdateState } from '../../update/check';
import { downloadApk, installApk } from '../../update/install';
import { formatCheckedAt } from '../../update/release';

export default function SettingsScreen() {
  const colors = useColors();
  const update = useSyncExternalStore(subscribeUpdates, getUpdateState);
  const [downloading, setDownloading] = useState(false);
  const [installFailed, setInstallFailed] = useState(false);

  // Publishes the stored last-check time on open; the throttle keeps it free.
  useEffect(() => {
    void checkForUpdate();
  }, []);

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
        <SettingSection title="Actualizaciones" className="mt-2">
          <InfoRow
            label="Estado"
            hint={statusHint(update)}
            value={statusValue(update)}
            valueColor={update.failed ? colors.notification : undefined}
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
                {downloading ? 'Descargando...' : 'Actualizar'}
              </Button>
              {installFailed ? (
                <Text className="text-sm" style={{ color: colors.notification }}>
                  No se pudo descargar. Inténtalo otra vez.
                </Text>
              ) : null}
            </View>
          ) : null}
        </SettingSection>

        <SettingSection title="Aplicación">
          <InfoRow label="Versión" value={currentVersion()} />
        </SettingSection>
      </ScrollView>
    </Screen>
  );
}

function statusValue(update: UpdateState): string {
  if (update.checking) {
    return 'Comprobando...';
  }

  if (update.failed) {
    return 'Error al comprobar';
  }

  if (update.available !== null) {
    return `${update.available.tag} disponible`;
  }

  return 'Al día';
}

function statusHint(update: UpdateState): string | null {
  if (update.failed) {
    return 'Toca para reintentar la comprobación';
  }

  if (update.checking) {
    return null;
  }

  if (update.checkedAt === null) {
    return 'Toca para comprobar actualizaciones';
  }

  return `Última comprobación: ${formatCheckedAt(update.checkedAt, Date.now())}`;
}

function InfoRow({
  label,
  hint,
  value,
  valueColor,
  trailing,
  disabled = false,
  onPress,
}: {
  label: string;
  value: string;
  hint?: string | null;
  valueColor?: string;
  trailing?: ReactNode;
  disabled?: boolean;
  onPress?: () => void;
}) {
  const colors = useColors();
  const actionable = onPress !== undefined && trailing === undefined;
  const className = 'min-h-14 flex-row items-center px-4';
  const content = (
    <>
      <View className="flex-1 pr-3">
        <Text className="text-base text-zinc-900 dark:text-zinc-100">
          {label}
        </Text>
        {hint ? (
          <Text className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {hint}
          </Text>
        ) : null}
      </View>
      <Text
        className={
          valueColor === undefined
            ? 'text-sm text-zinc-500 dark:text-zinc-400'
            : 'text-sm'
        }
        style={valueColor === undefined ? undefined : { color: valueColor }}
      >
        {value}
      </Text>
      {trailing ? <View className="ml-2">{trailing}</View> : null}
      {actionable ? (
        <View className="ml-1">
          <Feather
            name="chevron-right"
            size={20}
            color={colors.iconInactive}
          />
        </View>
      ) : null}
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