import type { ReactNode } from 'react';
import { Feather } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';

import { AppPressable } from '../../../components/AppPressable';
import { useColors } from '../../../theme/colors';
import { SHEET_HEIGHT } from '../../../theme/spacing';

/** Scrim, sliding sheet and header shared by the reader's bottom sheets. */
export function ReaderSheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const colors = useColors();

  return (
    <Animated.View
      entering={FadeIn.duration(120)}
      accessibilityViewIsModal
      className="absolute inset-0 justify-end"
      style={{ zIndex: 50 }}
    >
      <AppPressable
        accessible={false}
        onPress={onClose}
        pressFeedback={false}
        className="absolute inset-0"
        style={{ backgroundColor: colors.scrim }}
      />
      <Animated.View
        entering={SlideInDown.duration(200)}
        className="rounded-t-2xl"
        style={{ backgroundColor: colors.surface, height: SHEET_HEIGHT }}
      >
        <View className="min-h-14 flex-row items-center justify-between px-4">
          <Text
            className="text-base font-semibold"
            style={{ color: colors.text }}
          >
            {title}
          </Text>
          <AppPressable
            accessibilityLabel="Cerrar"
            onPress={onClose}
            className="min-h-12 min-w-12 items-center justify-center rounded-full"
          >
            <Feather name="x" size={20} color={colors.textMuted} />
          </AppPressable>
        </View>
        {children}
      </Animated.View>
    </Animated.View>
  );
}
