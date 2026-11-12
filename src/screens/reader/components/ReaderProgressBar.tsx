import { Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, useReducedMotion } from 'react-native-reanimated';

import { reader } from '../../../theme/colors';

export function ReaderProgressBar({
  page,
  total,
  bottomInset,
}: {
  page: number;
  total: number;
  bottomInset: number;
}) {
  const reduced = useReducedMotion();

  if (total <= 0) {
    return null;
  }

  return (
    <Animated.View
      entering={reduced ? undefined : FadeIn.duration(150)}
      exiting={reduced ? undefined : FadeOut.duration(150)}
      pointerEvents="box-none"
      className="absolute left-4 right-4 flex-row items-center"
      style={{ bottom: bottomInset + 8 }}
    >
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel="Progreso de lectura"
        accessibilityValue={{ min: 1, max: total, now: page + 1 }}
        className="flex-1 flex-row items-center rounded-full px-3 py-2"
        style={{ backgroundColor: reader.overlay }}
      >
        <View
          className="h-0.5 flex-1 overflow-hidden rounded-full"
          style={{ backgroundColor: reader.track }}
        >
          <View
            className="h-full rounded-full"
            style={{
              width: `${((page + 1) / total) * 100}%`,
              backgroundColor: reader.bar,
            }}
          />
        </View>
        <Text className="ml-3 text-xs font-semibold" style={{ color: reader.text }}>
          {page + 1} / {total}
        </Text>
      </View>
    </Animated.View>
  );
}
