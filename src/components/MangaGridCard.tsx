import { Text, View } from 'react-native';
import { Image } from 'expo-image';

import { COVER_ASPECT_RATIO } from '../theme/layout';
import { AppPressable } from './AppPressable';

type Props = {
  title: string;
  cover: string;
  subtitle?: string;
  width: number;
  onPress: () => void;
  onLongPress?: () => void;
};

export function MangaGridCard({
  title,
  cover,
  subtitle,
  width,
  onPress,
  onLongPress,
}: Props) {
  return (
    <AppPressable
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      accessibilityHint={
        onLongPress ? 'Mantén pulsado para quitar de la biblioteca' : undefined
      }
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      style={{ width }}
      className="mb-3 rounded-2xl p-1"
    >
      <View
        className="overflow-hidden rounded-xl bg-zinc-200 dark:bg-zinc-800"
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
    </AppPressable>
  );
}
