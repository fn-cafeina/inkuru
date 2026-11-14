import { Feather } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { AnimatedPressable } from './AnimatedPressable';
import { palette, reader, useColors } from '../theme/colors';

export function ErrorState({
  message,
  onRetry,
  tone = 'auto',
}: {
  message: string;
  onRetry: () => void;
  tone?: 'auto' | 'dark';
}) {
  const colors = useColors();
  const dark = tone === 'dark';
  const muted = dark ? reader.textMuted : colors.textMuted;
  const accent = dark ? palette.dark.accent : colors.accent;

  return (
    <View className="flex-1 items-center justify-center px-5">
      <Feather name="alert-circle" size={48} color={muted} />
      <Text
        className="mt-2 text-center text-lg font-bold"
        style={{ color: muted }}
      >
        {message}
      </Text>
      <AnimatedPressable
        accessibilityLabel="Reintentar"
        onPress={onRetry}
        className="mt-4 flex-row items-center rounded-xl px-6 py-3"
        style={{ backgroundColor: `${accent}26` }}
      >
        <Feather name="refresh-cw" size={16} color={accent} />
        <Text
          className="ml-2 text-xs font-semibold tracking-wide"
          style={{ color: accent }}
        >
          Reintentar
        </Text>
      </AnimatedPressable>
    </View>
  );
}
