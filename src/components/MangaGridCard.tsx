import { memo } from 'react';
import { Text, View } from 'react-native';
import { Image } from 'expo-image';

import { COVER_ASPECT_RATIO } from '../theme/layout';
import { AnimatedPressable } from './AnimatedPressable';

type Props = {
  path: string;
  title: string;
  cover: string;
  width: number;
  /** Stable across renders so the memoized card can bail out. */
  onOpen: (path: string, title: string) => void;
};

/**
 * One grid cell. Memoized: typing in a search box or a pagination spinner
 * re-renders the screen, never the cards whose props did not change.
 */
function MangaGridCardBase({ path, title, cover, width, onOpen }: Props) {
  return (
    <View style={{ width }} className="mb-3">
      <AnimatedPressable
        accessibilityLabel={title}
        hapticFeedback
        onPress={() => onOpen(path, title)}
      >
        <View
          className="overflow-hidden rounded-xl bg-neutral-800"
          style={{ width: '100%', aspectRatio: COVER_ASPECT_RATIO }}
        >
          <Image
            source={{ uri: cover }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            cachePolicy="memory-disk"
            recyclingKey={cover}
            transition={100}
            accessible={false}
          />
        </View>
        <Text
          numberOfLines={2}
          className="mt-2 text-sm font-medium text-white"
        >
          {title}
        </Text>
      </AnimatedPressable>
    </View>
  );
}

export const MangaGridCard = memo(MangaGridCardBase);
