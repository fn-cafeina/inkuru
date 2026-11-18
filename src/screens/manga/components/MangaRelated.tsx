import { memo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { AnimatedPressable } from '../../../components/AnimatedPressable';
import type { RelatedManga } from '../../../source/zonatmo';
import { useColors } from '../../../theme/colors';
import { COVER_ASPECT_RATIO } from '../../../theme/layout';

const CARD_WIDTH = 100;

type Props = {
  items: RelatedManga[];
  /** Stable across renders so the memoized row can bail out. */
  onOpen: (path: string, title: string) => void;
};

/** Horizontal strip under the synopsis, one card per related manga. */
function MangaRelatedBase({ items, onOpen }: Props) {
  const colors = useColors();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-3"
    >
      {items.map((item) => (
        <AnimatedPressable
          key={item.path}
          accessibilityLabel={item.title}
          hapticFeedback
          onPress={() => onOpen(item.path, item.title)}
          style={{ width: CARD_WIDTH }}
        >
          <View
            className="overflow-hidden rounded-xl bg-neutral-800"
            style={{ width: '100%', aspectRatio: COVER_ASPECT_RATIO }}
          >
            <Image
              source={{ uri: item.cover }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              cachePolicy="memory-disk"
              recyclingKey={item.cover}
              transition={100}
              accessible={false}
            />
            {item.type ? (
              <View
                className="absolute left-1.5 top-1.5 rounded-md px-1.5 py-0.5"
                style={{ backgroundColor: colors.accent }}
              >
                <Text className="text-[9px] font-bold uppercase text-neutral-950">
                  {item.type}
                </Text>
              </View>
            ) : null}
          </View>
          <Text
            numberOfLines={2}
            className="mt-1.5 text-xs font-medium text-neutral-300"
          >
            {item.title}
          </Text>
        </AnimatedPressable>
      ))}
    </ScrollView>
  );
}

export const MangaRelated = memo(MangaRelatedBase);
