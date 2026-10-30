import { ActivityIndicator, View } from 'react-native';

import { Skeleton } from '../../../components/Skeleton';
import { READER_PAGE_ASPECT_RATIO } from '../../../theme/layout';

export function ReaderSkeleton({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  return (
    <View className="flex-1 items-center bg-zinc-950" style={{ height }}>
      <View
        style={{
          width,
          height: width / READER_PAGE_ASPECT_RATIO,
        }}
      >
        <Skeleton tone="dark" className="h-full w-full" />
        <View className="absolute inset-0 items-center justify-center">
          <ActivityIndicator color="#a1a1aa" />
        </View>
      </View>
    </View>
  );
}
