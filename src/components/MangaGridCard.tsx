import { Image, Text } from 'react-native';

import { COVER_ASPECT_RATIO } from '../theme/layout';
import { AppPressable } from './AppPressable';

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
    <AppPressable
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      onPress={onPress}
      style={{ width }}
      className="mb-4 rounded-lg p-1"
    >
      <Image
        source={{ uri: cover }}
        style={{ width: '100%', aspectRatio: COVER_ASPECT_RATIO }}
        className="rounded-lg bg-zinc-200 dark:bg-zinc-800"
        resizeMode="cover"
        accessible={false}
      />
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
