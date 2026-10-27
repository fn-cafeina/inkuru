import { useEffect, useState } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Animated, View } from 'react-native';

import { COVER_ASPECT_RATIO } from '../theme/layout';

type Props = {
  className?: string;
  style?: StyleProp<ViewStyle>;
};

export function Skeleton({ className, style }: Props) {
  const [opacity] = useState(() => new Animated.Value(0.5));

  useEffect(() => {
    const loop = Animated.loop(
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
    loop.start();

    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
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
            className="rounded-xl"
            style={{ width: cardWidth, aspectRatio: COVER_ASPECT_RATIO }}
          />
          <Skeleton className="mt-2 h-4 rounded" />
          <Skeleton className="mt-1.5 h-3 w-2/3 rounded" />
        </View>
      ))}
    </View>
  );
}
