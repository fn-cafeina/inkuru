import type { ReactNode } from 'react';
import { Feather } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';

import { AppPressable } from '../../../components/AppPressable';
import { useColors } from '../../../theme/colors';

/** Sheet heights as a share of the window. A chapter list needs more room
 * than four preference rows, so the sheet does not get to pick one height. */
export const SHEET_HEIGHT = {
  compact: '50%',
  tall: '85%',
} as const;

/** Scrim, sliding sheet and header shared by the reader's bottom sheets. */
export function ReaderSheet({
  title,
  onClose,
  height = SHEET_HEIGHT.compact,
  children,
}: {
  title: string;
  onClose: () => void;
  height?: (typeof SHEET_HEIGHT)[keyof typeof SHEET_HEIGHT];
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
        style={{ backgroundColor: colors.surface, height }}
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
