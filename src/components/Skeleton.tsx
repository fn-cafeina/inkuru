import { useEffect } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Animated, View } from 'react-native';

import { COVER_ASPECT_RATIO } from '../theme/layout';

type Props = {
  className?: string;
  style?: StyleProp<ViewStyle>;
};

// One pulse for every placeholder on screen: starting a loop per skeleton made
// grids flicker out of phase.
const opacity = new Animated.Value(0.5);
let pulse: Animated.CompositeAnimation | null = null;
let subscribers = 0;

function subscribePulse() {
  subscribers += 1;

  if (subscribers === 1) {
    opacity.setValue(0.5);
    pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
  }

  return () => {
    subscribers -= 1;

    if (subscribers === 0) {
      pulse?.stop();
      pulse = null;
    }
  };
}

export function Skeleton({ className, style }: Props) {
  useEffect(subscribePulse, []);

  return (
    <Animated.View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      className={`bg-zinc-200 dark:bg-zinc-800 ${className ?? ''}`}
      style={[{ opacity }, style]}
    />
  );
}

/** Mirrors the 3-column MangaGridCard layout used by Discover and Library. */
export function MangaGridSkeleton({ cardWidth }: { cardWidth: number }) {
  return (
    <View className="flex-row flex-wrap px-4" style={{ gap: 12 }}>
      {Array.from({ length: 9 }, (_, index) => (
        <View key={index} style={{ width: cardWidth }}>
          <Skeleton
            className="rounded-lg"
            style={{ width: cardWidth, aspectRatio: COVER_ASPECT_RATIO }}
          />
          <Skeleton className="mt-2 h-4 rounded" />
          <Skeleton className="mt-1.5 h-3 w-2/3 rounded" />
        </View>
      ))}
    </View>
  );
}
