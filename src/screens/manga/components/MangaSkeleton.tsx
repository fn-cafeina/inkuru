import { ScrollView, View } from 'react-native';

import { ListDivider } from '../../../components/ListDivider';
import { Skeleton } from '../../../components/Skeleton';
import { COVER_ASPECT_RATIO } from '../../../theme/layout';
import { SCREEN_PADDING } from '../../../theme/spacing';

/** Honest detail placeholder: only blocks that always exist. */
export function MangaSkeleton() {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: SCREEN_PADDING,
        paddingBottom: 24,
      }}
    >
      <View className="flex-row">
        <Skeleton
          className="rounded-2xl"
          style={{ width: '34%', aspectRatio: COVER_ASPECT_RATIO }}
        />
        <View className="ml-4 flex-1">
          <Skeleton className="h-5 w-3/4 rounded" />
          <Skeleton className="mt-1 h-5 w-1/2 rounded" />
          <Skeleton className="mt-2 h-6 w-24 rounded-full" />
        </View>
      </View>

      <View className="mt-4 flex-row gap-1.5">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-14 rounded-full" />
      </View>

      <Skeleton className="mt-4 h-14 rounded-full" />

      <View className="mt-6 flex-row items-center justify-between">
        <Skeleton className="h-3 w-28 rounded" />
        <Skeleton className="h-10 w-10 rounded-full" />
      </View>

      {Array.from({ length: 4 }, (_, index) => (
        <View key={index}>
          {index > 0 ? <ListDivider /> : null}
          <View className="min-h-14 justify-center">
            <Skeleton
              className="h-4 rounded"
              style={{ width: `${55 + (index % 3) * 15}%` }}
            />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
