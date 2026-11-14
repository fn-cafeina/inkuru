import { Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeOut,
  useReducedMotion,
} from 'react-native-reanimated';

import { AnimatedPressable } from '../../../components/AnimatedPressable';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { reader } from '../../../theme/colors';

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
  const reduced = useReducedMotion();
  const fade = reduced ? undefined : FadeIn.duration(150);
  const fadeOut = reduced ? undefined : FadeOut.duration(150);

  return (
    <>
      {showError ? (
        <View
          pointerEvents="box-none"
          className="absolute left-0 right-0 top-0 items-center"
          style={{ paddingTop: topInset + (visible ? 64 : 8) }}
        >
          <AnimatedPressable
            accessibilityLabel="No se pudo actualizar. Reintentar"
            hitSlop={4}
            onPress={onRetry}
            className="min-h-12 flex-row items-center rounded-full px-4"
            style={{ backgroundColor: reader.text }}
          >
            <Feather name="refresh-cw" size={14} color={reader.background} />
            <Text
              className="ml-2 text-xs"
              style={{ color: reader.background }}
            >
              No se pudo actualizar. Reintentar
            </Text>
          </AnimatedPressable>
        </View>
      ) : null}

      {visible ? (
        <Animated.View
          entering={fade}
          exiting={fadeOut}
          className="absolute left-0 right-0 top-0"
          style={{ paddingTop: topInset, backgroundColor: reader.background }}
        >
          <ScreenHeader
            title={title}
            subtitle={subtitle}
            tone="dark"
            onBack={onBack}
            action={
              <View className="flex-row items-center">
                <AnimatedPressable
                  accessibilityLabel="Lista de capítulos"
                  onPress={onOpenPicker}
                  className="mr-2 min-h-12 min-w-12 items-center justify-center rounded-full border"
                  style={{ borderColor: reader.border }}
                >
                  <Feather name="list" size={18} color={reader.text} />
                </AnimatedPressable>
                <AnimatedPressable
                  accessibilityLabel="Ajustes de lectura"
                  onPress={onOpenSettings}
                  className="min-h-12 min-w-12 items-center justify-center rounded-full border"
                  style={{ borderColor: reader.border }}
                >
                  <Feather name="settings" size={18} color={reader.text} />
                </AnimatedPressable>
              </View>
            }
          />
        </Animated.View>
      ) : null}
    </>
  );
}
