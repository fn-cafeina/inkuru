import { View } from 'react-native';

import { Skeleton } from '../../../components/Skeleton';
import { COVER_ASPECT_RATIO } from '../../../theme/layout';

export function MangaSkeleton() {
  return (
    <View>
      <View className="flex-row px-4">
        <Skeleton
          className="rounded-xl"
          style={{ width: 144, aspectRatio: COVER_ASPECT_RATIO }}
        />
        <View className="ml-4 flex-1">
          <Skeleton className="h-6 w-3/4 rounded" />
          <Skeleton className="mt-2 h-6 w-24 rounded-full" />
          <Skeleton className="mt-2 h-4 w-2/3 rounded" />
        </View>
      </View>
      <View className="mt-4 px-4">
        <Skeleton className="h-14 rounded-full" />
      </View>
      <View className="mt-4 gap-1.5 px-4">
        <View className="flex-row gap-1.5">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-14 rounded-full" />
        </View>
        <View className="flex-row gap-1.5">
          <Skeleton className="h-6 w-12 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </View>
      </View>
      <View className="mt-6 px-4">
        <Skeleton className="h-3 w-24 rounded" />
        <Skeleton className="mt-3 h-4 w-5/6 rounded" />
        <Skeleton className="mt-2 h-4 w-2/3 rounded" />
      </View>
      <View className="mt-6 px-4">
        <Skeleton className="h-3 w-28 rounded" />
      </View>
      {Array.from({ length: 8 }, (_, index) => (
        <View key={index} className="min-h-14 justify-center px-4 py-3">
          <Skeleton
            className="h-4 rounded"
            style={{ width: `${55 + (index % 3) * 15}%` }}
          />
        </View>
      ))}
    </View>
  );
}
