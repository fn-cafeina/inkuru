import { Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';

import { COVER_ASPECT_RATIO } from '../theme/layout';
import { AppPressable } from './AppPressable';
import { useColors } from '../theme/colors';

type Props = {
  title: string;
  cover: string;
  subtitle?: string;
  width: number;
  /** Reveals a remove button; long press alone is undiscoverable. */
  onRemove?: () => void;
  onPress: () => void;
};

export function MangaGridCard({
  title,
  cover,
  subtitle,
  width,
  onRemove,
  onPress,
}: Props) {
  const colors = useColors();

  return (
    <View style={{ width }} className="mb-3">
      <AppPressable
        accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
        onPress={onPress}
        className="rounded-2xl p-1"
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
      {onRemove ? (
        <AppPressable
          accessibilityLabel={`Quitar ${title} de la biblioteca`}
          hitSlop={4}
          onPress={onRemove}
          className="mt-1 min-h-12 flex-row items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-800"
        >
          <Feather name="x" size={14} color={colors.iconInactive} />
          <Text className="ml-1.5 text-xs text-zinc-600 dark:text-zinc-300">
            Quitar
          </Text>
        </AppPressable>
      ) : null}
    </View>
  );
}
