import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';

import { Skeleton } from '../../../components/Skeleton';
import { COVER_ASPECT_RATIO } from '../../../theme/layout';

/**
 * Honest detail placeholder: cover, title and status, tags, the read button,
 * the chapters heading and its range chips, then the chapter cards. Blocks
 * that only appear on some mangas, like the progress bar, stay out.
 */
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
          <Skeleton className="h-6 w-4/5 rounded" />
          <Skeleton className="mt-2 h-6 w-3/5 rounded" />
          <Skeleton className="mt-2 h-6 w-20 self-start rounded-lg" />
        </View>
      </View>

      <View className="mt-4 flex-row gap-1.5 px-5">
        <Skeleton className="h-6 w-16 rounded-md" />
        <Skeleton className="h-6 w-20 rounded-md" />
        <Skeleton className="h-6 w-14 rounded-md" />
      </View>

      <View className="mt-4 px-5">
        <Skeleton className="h-14 rounded-xl" />
      </View>

      <View className="mt-6 px-5">
        <Skeleton className="mb-3 h-3.5 w-16 rounded" />
        <Skeleton className="h-3.5 w-full rounded" />
        <Skeleton className="mt-2 h-3.5 w-11/12 rounded" />
        <Skeleton className="mt-2 h-3.5 w-2/3 rounded" />
      </View>

      <View className="mt-6 flex-row items-center justify-between px-5">
        <Skeleton className="h-3.5 w-28 rounded" />
        <Skeleton className="h-12 w-12 rounded-full" />
      </View>

      <View className="mt-3 flex-row gap-3 overflow-hidden px-5 pb-3">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-8 rounded-lg" style={{ width: 90 }} />
        ))}
      </View>

      {Array.from({ length: 6 }, (_, index) => (
        <View key={index}>
          {index > 0 ? <View className="h-3" /> : null}
          {/* The real card is a filled surface. Filling it here as well put a
              grey band under the header and left the rows reading as empty
              boxes, so the shape is drawn with the border alone and every
              block on the screen keeps the same tone. */}
          <View className="mx-5 overflow-hidden rounded-xl border border-neutral-800">
            <View className="flex-row items-center justify-between p-4">
              <Skeleton
                className="h-5 rounded"
                style={{ width: `${50 + (index % 3) * 15}%` }}
              />
              <Skeleton className="h-[18px] w-[18px] rounded-full" />
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
