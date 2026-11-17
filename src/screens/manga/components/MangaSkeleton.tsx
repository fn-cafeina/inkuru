import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';

import { Skeleton } from '../../../components/Skeleton';
import { COVER_ASPECT_RATIO } from '../../../theme/layout';

/** Honest detail placeholder: only blocks that always exist. */
export function MangaSkeleton({ topBar }: { topBar: ReactNode }) {
  return (
    <ScrollView
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 24 }}
    >
      {topBar}
      <View className="flex-row px-5">
        <Skeleton
          className="rounded-2xl"
          style={{ width: '34%', aspectRatio: COVER_ASPECT_RATIO }}
        />
        <View className="ml-4 flex-1">
          <Skeleton className="h-5 w-3/4 rounded" />
          <Skeleton className="mt-1 h-5 w-1/2 rounded" />
          <Skeleton className="mt-2 h-6 w-24 rounded-lg" />
        </View>
      </View>

      <View className="mt-4 flex-row gap-1.5 px-5">
        <Skeleton className="h-6 w-16 rounded-md" />
        <Skeleton className="h-6 w-20 rounded-md" />
        <Skeleton className="h-6 w-14 rounded-md" />
      </View>

      <View className="px-5">
        <Skeleton className="mt-4 h-14 rounded-xl" />
      </View>

      <View className="mt-6 flex-row items-center justify-between px-5">
        <Skeleton className="h-3 w-28 rounded" />
        <Skeleton className="h-10 w-10 rounded-full" />
      </View>

      <View className="mx-5 mt-3 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
        {Array.from({ length: 4 }, (_, index) => (
          <View key={index}>
            {index > 0 ? <View className="ml-4 h-px bg-neutral-800" /> : null}
            <View className="min-h-14 justify-center px-4">
              <Skeleton
                className="h-4 rounded"
                style={{ width: `${55 + (index % 3) * 15}%` }}
              />
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
