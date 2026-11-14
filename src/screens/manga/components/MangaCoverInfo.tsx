import { Text, View } from 'react-native';
import { Image } from 'expo-image';

import { COVER_ASPECT_RATIO } from '../../../theme/layout';
import { useColors } from '../../../theme/colors';

const FACT_VALUES: Record<string, string> = {
  Ongoing: 'En emisión',
  Completed: 'Completa',
  Cancelled: 'Cancelada',
  Canceled: 'Cancelada',
  Hiatus: 'En pausa',
};

/** Source vocabulary to Spanish; unknown values are shown as they arrive. */
export function mangaStatusLabel(status: string | undefined): string | undefined {
  return status ? (FACT_VALUES[status] ?? status) : undefined;
}

/**
 * Cover, title and status. The cover used to be fixed at 144dp next to the
 * title, which made the only hero element of the screen its smallest one.
 */
export function MangaCoverInfo({
  cover,
  title,
  status,
}: {
  cover: string;
  title: string;
  status?: string;
}) {
  const colors = useColors();

  return (
    <View className="flex-row px-5">
      <View
        className="overflow-hidden rounded-2xl bg-zinc-200 dark:bg-neutral-800"
        style={{ width: '34%', aspectRatio: COVER_ASPECT_RATIO }}
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
      <View className="ml-4 flex-1">
        <Text
          accessibilityRole="header"
          numberOfLines={4}
          className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50"
        >
          {title}
        </Text>
        {status ? (
          <View
            className="mt-2 self-start rounded-lg px-2.5 py-1"
            style={{ backgroundColor: colors.accentContainer }}
          >
            <Text
              className="text-[11px] font-bold uppercase tracking-wider"
              style={{ color: colors.onAccentContainer }}
            >
              {status}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
