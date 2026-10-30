import { Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { AppPressable } from '../../../components/AppPressable';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { useColors } from '../../../theme/colors';

type Props = {
  title: string;
  subtitle?: string;
  visible: boolean;
  showError: boolean;
  topInset: number;
  onBack: () => void;
  onOpenPicker: () => void;
  onOpenSettings: () => void;
  onRetry: () => void;
};

export function ReaderChrome({
  title,
  subtitle,
  visible,
  showError,
  topInset,
  onBack,
  onOpenPicker,
  onOpenSettings,
  onRetry,
}: Props) {
  const colors = useColors();

  return (
    <>
      {showError ? (
        <View
          pointerEvents="box-none"
          className="absolute left-0 right-0 top-0 items-center"
          style={{ paddingTop: topInset + (visible ? 64 : 8) }}
        >
          <AppPressable
            accessibilityLabel="No se pudo actualizar. Reintentar"
            hitSlop={4}
            onPress={onRetry}
            className="min-h-10 flex-row items-center rounded-full bg-zinc-900 px-4 dark:bg-zinc-100"
          >
            <Feather name="refresh-cw" size={14} color={colors.background} />
            <Text className="ml-2 text-xs text-white dark:text-zinc-900">
              No se pudo actualizar. Reintentar
            </Text>
          </AppPressable>
        </View>
      ) : null}

      {visible ? (
        <View
          className="absolute left-0 right-0 top-0 bg-zinc-950"
          style={{ paddingTop: topInset }}
        >
          <ScreenHeader
            title={title}
            subtitle={subtitle}
            tone="dark"
            onBack={onBack}
            action={
              <View className="flex-row items-center">
                <AppPressable
                  accessibilityLabel="Lista de capítulos"
                  onPress={onOpenPicker}
                  className="mr-2 min-h-12 min-w-12 items-center justify-center rounded-full border border-zinc-800"
                >
                  <Feather name="list" size={18} color="#f4f4f5" />
                </AppPressable>
                <AppPressable
                  accessibilityLabel="Ajustes de lectura"
                  onPress={onOpenSettings}
                  className="min-h-12 min-w-12 items-center justify-center rounded-full border border-zinc-800"
                >
                  <Feather name="settings" size={18} color="#f4f4f5" />
                </AppPressable>
              </View>
            }
          />
        </View>
      ) : null}
    </>
  );
}
