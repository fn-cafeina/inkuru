import { ActivityIndicator, View } from 'react-native';

import { Skeleton } from '../../../components/Skeleton';
import type { ReaderMode } from '../../../storage/readerSettings';
import { reader } from '../../../theme/colors';
import { READER_PAGE_ASPECT_RATIO } from '../../../theme/layout';

/**
 * Mirrors the real reader: a column of full-width pages in webtoon mode, one
 * full-screen page in paged mode.
 */
export function ReaderSkeleton({
  width,
  height,
  mode,
}: {
  width: number;
  height: number;
  mode: ReaderMode;
}) {
  const pageHeight = width / READER_PAGE_ASPECT_RATIO;

  return (
    <View
      className="flex-1"
      style={{ height, backgroundColor: reader.background }}
    >
      <View className="flex-1 items-center">
        {mode === 'webtoon' ? (
          <View style={{ width }}>
            <Skeleton
              tone="dark"
              className="w-full"
              style={{ height: pageHeight }}
            />
            <View className="h-1" />
            <Skeleton
              tone="dark"
              className="w-full"
              style={{ height: pageHeight * 0.6 }}
            />
          </View>
        ) : (
          <Skeleton tone="dark" style={{ width, height }} />
        )}
      </View>
      <View className="absolute inset-0 items-center justify-center">
        <ActivityIndicator color={reader.textMuted} />
      </View>
    </View>
  );
}
