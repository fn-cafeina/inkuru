import { useEffect, useSyncExternalStore, type ReactElement } from 'react';
import { AppState, Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut, SlideInDown } from 'react-native-reanimated';

import { AnimatedPressable } from '../../../components/AnimatedPressable';
import { useColors } from '../../../theme/colors';
import { getUpdateState } from '../../../update/check';
import {
  beginDownload,
  cancelDownload,
  clearResumeAfterPermission,
  closeUpdate,
  confirmUpdate,
  getFlowState,
  grantPermissionAndDownload,
  subscribeFlow,
} from '../../../update/flow';
import type { UpdatePhase } from '../../../update/flow';
import type { DownloadProgress } from '../../../update/install';

/** The phases the sheet actually renders; idle and ready show nothing. */
type VisiblePhase = Exclude<UpdatePhase, 'idle' | 'ready'>;

export function UpdateFlowSheet() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const flow = useSyncExternalStore(subscribeFlow, getFlowState);
  const { phase, progress, failure, resumeAfterPermission } = flow;

  // After granting the permission in system settings, resume automatically.
  // The flag is armed only while the permission screen is open, so an
  // unrelated app switch never starts a download on its own.
  useEffect(() => {
    if (!resumeAfterPermission) {
      return;
    }

    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') {
        return;
      }

      clearResumeAfterPermission();
      void beginDownload();
    });

    return () => sub.remove();
  }, [resumeAfterPermission]);

  if (phase === 'idle' || phase === 'ready') {
    return null;
  }

  // Download and install are not dismissable from the backdrop or the X.
  const dismissable =
    phase === 'confirm' || phase === 'permission' || phase === 'error';
  const tag = getUpdateState().available?.tag ?? '';

  return (
    <Animated.View
      entering={FadeIn.duration(150)}
      exiting={FadeOut.duration(150)}
      accessibilityViewIsModal
      className="absolute inset-0 justify-end"
      style={{ zIndex: 50 }}
    >
      <Pressable
        accessible={false}
        onPress={dismissable ? closeUpdate : undefined}
        className="absolute inset-0"
        style={{ backgroundColor: colors.scrim }}
      />
      <Animated.View
        entering={SlideInDown.duration(200)}
        className="rounded-t-2xl bg-white px-5 pt-5 dark:bg-neutral-900"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        <View className="mb-3 flex-row items-center justify-between">
          <Text
            accessibilityRole="header"
            className="text-xl font-semibold text-zinc-900 dark:text-zinc-50"
          >
            {titleFor(phase)}
          </Text>
          {dismissable ? (
            <AnimatedPressable
              accessibilityLabel="Cerrar"
              onPress={closeUpdate}
              className="min-h-12 min-w-12 items-center justify-center rounded-full"
            >
              <Feather name="x" size={20} color={colors.textMuted} />
            </AnimatedPressable>
          ) : null}
        </View>
        {phase === 'confirm' ? <ConfirmBody tag={tag} /> : null}
        {phase === 'permission' ? <PermissionBody /> : null}
        {phase === 'downloading' ? <DownloadingBody progress={progress} /> : null}
        {phase === 'installing' ? <InstallingBody /> : null}
        {phase === 'error' ? <ErrorBody failure={failure} /> : null}
        <Actions phase={phase} />
      </Animated.View>
    </Animated.View>
  );
}

function titleFor(phase: VisiblePhase): string {
  switch (phase) {
    case 'confirm':
      return 'Actualizar';
    case 'permission':
      return 'Permiso necesario';
    case 'downloading':
      return 'Descargando';
    case 'installing':
      return 'Preparando instalación';
    case 'error':
      return 'No se pudo actualizar';
  }
}

function ConfirmBody({ tag }: { tag: string }): ReactElement {
  return (
    <Text className="text-sm leading-5 text-zinc-500 dark:text-zinc-400">
      {`Versión ${tag} disponible.`}
    </Text>
  );
}

function PermissionBody(): ReactElement {
  return (
    <>
      <Text className="text-sm leading-5 text-zinc-500 dark:text-zinc-400">
        {'Para instalar actualizaciones, permití que Inkuru instale aplicaciones en los ajustes del sistema.'}
      </Text>
      <Text className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
        {'Al volver, la descarga continúa sola.'}
      </Text>
    </>
  );
}

function DownloadingBody({ progress }: { progress: DownloadProgress }): ReactElement {
  const colors = useColors();
  const pct =
    progress.totalBytes !== null && progress.totalBytes > 0
      ? Math.min(1, progress.receivedBytes / progress.totalBytes)
      : null;

  return (
    <>
      <View className="mt-1 h-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-neutral-800">
        <View
          className="h-full"
          style={{
            width: `${(pct ?? 0.03) * 100}%`,
            backgroundColor: colors.accent,
          }}
        />
      </View>
      <Text
        accessibilityLiveRegion="polite"
        className="mt-2 text-xs text-zinc-500 dark:text-zinc-400"
      >
        {pct !== null
          ? `${Math.round(pct * 100)}% · ${formatSize(progress.receivedBytes)}`
          : `${formatSize(progress.receivedBytes)} descargados`}
      </Text>
    </>
  );
}

function InstallingBody(): ReactElement {
  return (
    <Text className="text-sm leading-5 text-zinc-500 dark:text-zinc-400">
      {'Abriendo el instalador del sistema…'}
    </Text>
  );
}

function ErrorBody({ failure }: { failure: string | null }): ReactElement {
  return (
    <Text
      accessibilityLiveRegion="polite"
      numberOfLines={4}
      className="text-sm leading-5 text-zinc-500 dark:text-zinc-400"
    >
      {failure ?? 'Ocurrió un error inesperado.'}
    </Text>
  );
}

function Actions({ phase }: { phase: VisiblePhase }): ReactElement | null {
  const colors = useColors();

  if (phase === 'installing') {
    return null;
  }

  return (
    <View className="mt-5 flex-row border-t pt-2" style={{ borderColor: colors.border }}>
      <ActionButton
        label={phase === 'error' ? 'Cerrar' : 'Cancelar'}
        onPress={phase === 'downloading' ? cancelDownload : closeUpdate}
      />
      <View className="mx-2 h-8" style={{ backgroundColor: colors.border }} />
      <ActionButton
        label={
          phase === 'confirm'
            ? 'Actualizar'
            : phase === 'permission'
              ? 'Abrir ajustes'
              : 'Reintentar'
        }
        emphasized
        onPress={
          phase === 'confirm'
            ? () => void confirmUpdate()
            : phase === 'permission'
              ? () => void grantPermissionAndDownload()
              : () => void beginDownload()
        }
      />
    </View>
  );
}

function ActionButton({
  label,
  emphasized = false,
  onPress,
}: {
  label: string;
  emphasized?: boolean;
  onPress: () => void;
}) {
  const colors = useColors();

  return (
    <AnimatedPressable
      onPress={onPress}
      className="flex-1 items-center py-4"
    >
      <Text
        className={`text-sm ${emphasized ? 'font-medium' : ''}`}
        style={{ color: emphasized ? colors.accent : colors.textMuted }}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}

function formatSize(bytes: number): string {
  if (bytes <= 0) {
    return '0 MB';
  }

  const mb = bytes / (1024 * 1024);

  if (mb < 1) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${mb.toFixed(1)} MB`;
}
