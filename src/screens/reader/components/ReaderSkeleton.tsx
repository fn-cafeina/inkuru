import { View } from 'react-native';

import { Skeleton } from '../../../components/Skeleton';

export function ReaderSkeleton({ height }: { height: number }) {
  return (
    <View className="flex-1" style={{ height }}>
      <Skeleton className="h-full w-full" />
    </View>
  );
}
