import { ActivityIndicator, View } from 'react-native';

import { Skeleton } from '../../../components/Skeleton';
import { reader } from '../../../theme/colors';
import { READER_PAGE_ASPECT_RATIO } from '../../../theme/layout';

export function ReaderSkeleton({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  return (
    <View className="flex-1 items-center"
      style={{ height, backgroundColor: reader.background }}>
      <View
        style={{
          width,
          height: width / READER_PAGE_ASPECT_RATIO,
        }}
      >
        <Skeleton tone="dark" className="h-full w-full" />
        <View className="absolute inset-0 items-center justify-center">
          <ActivityIndicator color={reader.textMuted} />
        </View>
      </View>
    </View>
  );
}
