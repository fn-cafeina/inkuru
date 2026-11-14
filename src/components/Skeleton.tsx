import { useEffect } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Animated, ScrollView, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { reader } from '../theme/colors';
import { COVER_ASPECT_RATIO } from '../theme/layout';
import { GRID_GAP, SCREEN_PADDING } from '../theme/spacing';

type Props = {
  className?: string;
  style?: StyleProp<ViewStyle>;
  tone?: 'auto' | 'dark';
};

// One pulse for every placeholder on screen: starting a loop per skeleton made
// grids flicker out of phase. Amplitude and cadence follow rokimu.
const opacity = new Animated.Value(0.3);
let pulse: Animated.CompositeAnimation | null = null;
let subscribers = 0;

function subscribePulse() {
  subscribers += 1;

  if (subscribers === 1) {
    pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
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

export function Skeleton({ className, style, tone = 'auto' }: Props) {
  const reduced = useReducedMotion();

  useEffect(() => (reduced ? undefined : subscribePulse()), [reduced]);

  return (
    <Animated.View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      className={`${
        tone === 'dark' ? '' : 'bg-zinc-300 dark:bg-neutral-800'
      } ${className ?? ''}`}
      // A pulsing block over the reader's black canvas is invisible, so the
      // dark tone gets its own lighter block.
      style={[
        { opacity },
        tone === 'dark' ? { backgroundColor: reader.border } : null,
        style,
      ]}
    />
  );
}

/** Mirrors the 3-column MangaGridCard layout used by Discover. */
export function MangaGridSkeleton({ cardWidth }: { cardWidth: number }) {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: GRID_GAP,
        paddingHorizontal: SCREEN_PADDING,
      }}
    >
      {Array.from({ length: 6 }, (_, index) => (
        <View key={index} style={{ width: cardWidth }}>
          <Skeleton
            className="rounded-xl"
            style={{ width: cardWidth, aspectRatio: COVER_ASPECT_RATIO }}
          />
          <Skeleton className="mt-2 h-4 rounded" />
          <Skeleton className="mt-1 h-4 w-2/3 rounded" />
          <Skeleton className="mt-1 h-4 w-1/2 rounded" />
        </View>
      ))}
    </ScrollView>
  );
}
