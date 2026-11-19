import {
  useEffect,
  useSyncExternalStore,
  type ReactElement,
} from 'react';
import { AppState, Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut, SlideInDown } from 'react-native-reanimated';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useColors } from '@/theme/colors';
import { getUpdateState } from '@/update/check';
import {
  beginDownload,
  cancelDownload,
  clearResumeAfterPermission,
  closeUpdate,
  confirmUpdate,
  getFlowState,
  grantPermissionAndDownload,
  retryUpdate,
  subscribeFlow,
} from '@/update/flow';
import type { UpdatePhase } from '@/update/flow';
import type { DownloadProgress } from '@/update/install';

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
  const actions = renderActions(phase);

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
        className="rounded-t-xl px-5 pt-5"
        style={{
          backgroundColor: colors.surface,
          paddingBottom: insets.bottom + (actions === null ? 20 : 0),
        }}
      >
        <View className="mb-3 flex-row items-center justify-between">
          <Text
            accessibilityRole="header"
            className="text-xl font-bold"
            style={{ color: colors.text }}
          >
            {titleFor(phase)}
          </Text>
          {dismissable ? (
            <AnimatedPressable
              accessibilityLabel="Cerrar"
              onPress={closeUpdate}
              className="-mr-2 min-h-11 min-w-11 items-center justify-center rounded-full"
            >
              <Feather name="x" size={20} color={colors.textMuted} />
            </AnimatedPressable>
          ) : null}
        </View>
        <SheetBody
          phase={phase}
          tag={tag}
          progress={progress}
          failure={failure}
        />
        {actions === null ? null : (
          <View
            className="mt-5 -mx-5 flex-row border-t"
            style={{ borderColor: colors.border }}
          >
            {actions}
          </View>
        )}
      </Animated.View>
    </Animated.View>
  );
}

function SheetBody({
  phase,
  tag,
  progress,
  failure,
}: {
  phase: VisiblePhase;
  tag: string;
  progress: DownloadProgress;
  failure: string | null;
}): ReactElement {
  switch (phase) {
    case 'confirm':
      return <ConfirmBody tag={tag} />;
    case 'permission':
      return <PermissionBody />;
    case 'downloading':
      return <DownloadingBody progress={progress} />;
    case 'installing':
      return <InstallingBody />;
    case 'error':
      return <ErrorBody failure={failure} />;
  }
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

/** A cancel/confirm pair split by a hairline, like rokimu's update sheet. */
function Actions({
  secondary,
  primary,
}: {
  secondary: { label: string; onPress: () => void };
  primary?: { label: string; onPress: () => void };
}): ReactElement {
  const colors = useColors();

  return (
    <>
      <ActionButton label={secondary.label} onPress={secondary.onPress} />
      {primary === undefined ? null : (
        <>
          <View className="w-px" style={{ backgroundColor: colors.border }} />
          <ActionButton
            label={primary.label}
            emphasized
            onPress={primary.onPress}
          />
        </>
      )}
    </>
  );
}

function renderActions(phase: VisiblePhase): ReactElement | null {
  switch (phase) {
    case 'installing':
      return null;
    case 'downloading':
      // One way out: the download cancels itself, nothing to confirm.
      return <Actions secondary={{ label: 'Cancelar', onPress: cancelDownload }} />;
    case 'confirm':
      return (
        <Actions
          secondary={{ label: 'Cancelar', onPress: closeUpdate }}
          primary={{ label: 'Actualizar', onPress: () => void confirmUpdate() }}
        />
      );
    case 'permission':
      return (
        <Actions
          secondary={{ label: 'Cancelar', onPress: closeUpdate }}
          primary={{
            label: 'Abrir ajustes',
            onPress: () => void grantPermissionAndDownload(),
          }}
        />
      );
    case 'error':
      return (
        <Actions
          secondary={{ label: 'Cerrar', onPress: closeUpdate }}
          // Reinstalls the APK already downloaded, so a failed install does
          // not pay for the full download again.
          primary={{ label: 'Reintentar', onPress: () => void retryUpdate() }}
        />
      );
  }
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
    <AnimatedPressable onPress={onPress} className="flex-1 items-center py-4">
      <Text
        className={`text-sm ${emphasized ? 'font-medium' : ''}`}
        style={{ color: emphasized ? colors.accent : colors.textMuted }}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}

function ConfirmBody({ tag }: { tag: string }): ReactElement {
  return (
    <Text className="text-sm leading-5 text-neutral-400">
      {`Versión ${tag} disponible.`}
    </Text>
  );
}

function PermissionBody(): ReactElement {
  return (
    <>
      <Text className="text-sm leading-5 text-neutral-400">
        {'Para instalar actualizaciones, permití que Inkuru instale aplicaciones en los ajustes del sistema.'}
      </Text>
      <Text className="mt-2 text-xs text-neutral-500">
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
      <View className="mt-1 h-1 overflow-hidden rounded-full bg-neutral-800">
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
        className="mt-2 text-xs text-neutral-400"
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
    <Text className="text-sm leading-5 text-neutral-400">
      {'Abriendo el instalador del sistema…'}
    </Text>
  );
}

function ErrorBody({ failure }: { failure: string | null }): ReactElement {
  return (
    <Text
      accessibilityLiveRegion="polite"
      numberOfLines={4}
      className="text-sm leading-5 text-neutral-400"
    >
      {failure ?? 'Ocurrió un error inesperado.'}
    </Text>
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
