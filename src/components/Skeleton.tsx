import { useEffect } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Animated, ScrollView, View } from 'react-native';

import { COVER_ASPECT_RATIO } from '../theme/layout';
import {
  GRID_CARD_PADDING,
  GRID_GAP,
  SCREEN_PADDING,
} from '../theme/spacing';

type Props = {
  className?: string;
  style?: StyleProp<ViewStyle>;
  tone?: 'auto' | 'dark';
};

// One pulse for every placeholder on screen: starting a loop per skeleton made
// grids flicker out of phase.
const opacity = new Animated.Value(0.7);
let pulse: Animated.CompositeAnimation | null = null;
let subscribers = 0;

function subscribePulse() {
  subscribers += 1;

  if (subscribers === 1) {
    pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.95,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.6,
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

export function Skeleton({ className, style, tone = 'auto' }: Props) {
  useEffect(subscribePulse, []);

  return (
    <Animated.View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      className={`${
        tone === 'dark' ? 'bg-zinc-700' : 'bg-zinc-300 dark:bg-zinc-700'
      } ${className ?? ''}`}
      style={[{ opacity }, style]}
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
          <View style={{ padding: GRID_CARD_PADDING }}>
            <Skeleton
              className="rounded-xl"
              style={{
                width: cardWidth - GRID_CARD_PADDING * 2,
                aspectRatio: COVER_ASPECT_RATIO,
              }}
            />
            <Skeleton className="mt-2 h-4 rounded" />
            <Skeleton className="mt-1 h-4 w-2/3 rounded" />
            <Skeleton className="mt-1 h-4 w-1/2 rounded" />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
