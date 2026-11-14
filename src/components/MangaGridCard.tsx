import { Text, View } from 'react-native';
import { Image } from 'expo-image';

import { COVER_ASPECT_RATIO } from '../theme/layout';
import { AnimatedPressable } from './AnimatedPressable';

type Props = {
  title: string;
  cover: string;
  subtitle?: string;
  width: number;
  onPress: () => void;
};

export function MangaGridCard({
  title,
  cover,
  subtitle,
  width,
  onPress,
}: Props) {
  return (
    <View style={{ width }} className="mb-3">
      <AnimatedPressable
        accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
        hapticFeedback
        onPress={onPress}
        className="rounded-2xl p-1"
      >
        <View
          className="overflow-hidden rounded-xl bg-zinc-200 dark:bg-neutral-800"
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
          className="mt-2 text-sm font-medium text-zinc-900 dark:text-zinc-100"
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            numberOfLines={1}
            className="mt-1 text-xs text-zinc-500 dark:text-zinc-400"
          >
            {subtitle}
          </Text>
        ) : null}
      </AnimatedPressable>
    </View>
  );
}
