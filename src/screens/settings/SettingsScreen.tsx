import type { ReactNode } from 'react';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { DownloadProgress } from 'expo-file-system';

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
import { downloadApk, installApk, removeApk } from '../../update/install';
import { formatCheckedAt } from '../../update/release';

type Phase = 'idle' | 'download' | 'install';

const HINT_TICK_MS = 30_000;
const DOWNLOAD_FAILED = 'No se pudo descargar. Inténtalo otra vez.';
const INSTALL_FAILED = 'No se pudo abrir el instalador. Inténtalo otra vez.';

export default function SettingsScreen() {
  const colors = useColors();
  const update = useSyncExternalStore(subscribeUpdates, getUpdateState);
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState<number | null>(null);
  const [installError, setInstallError] = useState<string | null>(null);
  // Ticks while the screen is open so the "last checked" hint stays honest.
  const [now, setNow] = useState(() => Date.now());
  const abort = useRef<AbortController | null>(null);

  // Publishes the stored last-check time on open; the throttle keeps it free.
  useEffect(() => {
    void checkForUpdate();
    const timer = setInterval(() => setNow(Date.now()), HINT_TICK_MS);

    return () => {
      clearInterval(timer);
      abort.current?.abort();
    };
  }, []);

  function onDownloadProgress(data: DownloadProgress): void {
    setProgress(
      data.totalBytes > 0
        ? Math.floor((data.bytesWritten / data.totalBytes) * 100)
        : null,
    );
  }

  function cancel(): void {
    abort.current?.abort();
  }

  async function install(): Promise<void> {
    const release = update.available;

    if (release === null || phase !== 'idle') {
      return;
    }

    const controller = new AbortController();

    abort.current = controller;
    setPhase('download');
    setProgress(null);
    setInstallError(null);
    let step: 'download' | 'install' = 'download';

    try {
      const apk = await downloadApk(
        release.apkUrl,
        controller.signal,
        onDownloadProgress,
      );

      step = 'install';
      await installApk(apk);
    } catch {
      if (step === 'download') {
        // Failed or cancelled mid-download: drop the partial APK.
        removeApk();
      }

      if (!controller.signal.aborted) {
        setInstallError(step === 'download' ? DOWNLOAD_FAILED : INSTALL_FAILED);
      }
    } finally {
      abort.current = null;
      setPhase('idle');
      setProgress(null);
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
            hint={statusHint(update, now)}
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
              <View className="flex-row items-center gap-3">
                <View className="flex-1">
                  <Button
                    size="lg"
                    disabled={phase !== 'idle'}
                    onPress={() => void install()}
                  >{
                    actionLabel(phase, progress)
                  }
                  </Button>
                </View>
                {phase === 'download' ? (
                  <Button size="lg" variant="secondary" onPress={cancel}>
                    Cancelar
                  </Button>
                ) : null}
              </View>
              {installError !== null ? (
                <Text className="text-sm" style={{ color: colors.notification }}>
                  {installError}
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

function actionLabel(phase: Phase, progress: number | null): string {
  if (phase === 'install') {
    return 'Instalando...';
  }

  if (phase === 'download') {
    return progress === null ? 'Descargando...' : `Descargando ${String(progress)}%`;
  }

  return 'Actualizar';
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

function statusHint(update: UpdateState, now: number): string | null {
  if (update.failed) {
    return 'Toca para reintentar la comprobación';
  }

  if (update.checking) {
    return null;
  }

  if (update.checkedAt === null) {
    return 'Toca para comprobar actualizaciones';
  }

  return `Última comprobación: ${formatCheckedAt(update.checkedAt, now)}`;
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