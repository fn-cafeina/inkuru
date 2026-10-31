import type { ComponentProps } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { AppPressable } from '../../../components/AppPressable';
import type { DownloadState, DownloadStatus } from '../../../downloads/types';
import { useColors } from '../../../theme/colors';

type FeatherName = ComponentProps<typeof Feather>['name'];

function labelFor(status: DownloadStatus | undefined, title: string): string {
  if (status === 'queued' || status === 'downloading') {
    return `Cancelar descarga de ${title}`;
  }

  if (status === 'done') {
    return `Eliminar descarga de ${title}`;
  }

  if (status === 'failed') {
    return `Reintentar descarga de ${title}`;
  }

  return `Descargar ${title}`;
}

function iconFor(status: DownloadStatus | undefined): FeatherName {
  if (status === 'queued') {
    return 'clock';
  }

  if (status === 'done') {
    return 'check-circle';
  }

  if (status === 'failed') {
    return 'alert-circle';
  }

  return 'download';
}

function colorFor(
  status: DownloadStatus | undefined,
  colors: ReturnType<typeof useColors>,
): string {
  if (status === 'failed') {
    return colors.notification;
  }

  if (status === 'queued' || status === 'done') {
    return colors.accent;
  }

  return colors.iconInactive;
}

export function ChapterDownloadButton({
  title,
  state,
  onPress,
}: {
  title: string;
  state?: DownloadState;
  onPress: () => void;
}) {
  const colors = useColors();
  const status = state?.status;
  const progress =
    state !== undefined && state.status === 'downloading' && state.total > 0
      ? state.page / state.total
      : 0;

  return (
    <AppPressable
      accessibilityRole="button"
      accessibilityLabel={labelFor(status, title)}
      hitSlop={4}
      onPress={onPress}
      className="min-h-11 min-w-11 items-center justify-center rounded-full"
    >
      {status === 'downloading' ? (
        <View className="items-center">
          <ActivityIndicator size="small" color={colors.accent} />
          <View className="mt-1 h-0.5 w-6 overflow-hidden rounded-full bg-zinc-300 dark:bg-zinc-700">
            <View
              className="h-full rounded-full"
              style={{
                width: `${Math.round(progress * 100)}%`,
                backgroundColor: colors.accent,
              }}
            />
          </View>
        </View>
      ) : (
        <Feather
          name={iconFor(status)}
          size={18}
          color={colorFor(status, colors)}
        />
      )}
    </AppPressable>
  );
}
