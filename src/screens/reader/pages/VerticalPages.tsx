import { useCallback, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';
import type { ListViewToken } from 'react-native';

import type {
  ReaderQuality,
  ReaderScale,
} from '../../../storage/readerSettings';
import { READER_PAGE_ASPECT_RATIO } from '../../../theme/layout';
import { ReaderPage } from '../components/ReaderPage';

/** Estimated height until a page reports its real size. */
const PAGE_HEIGHT_RATIO = READER_PAGE_ASPECT_RATIO;

export function VerticalPages({
  pages,
  width,
  windowHeight,
  scale,
  quality,
  initialPage,
  onPageChange,
  onToggleChrome,
  footer,
}: {
  pages: string[];
  width: number;
  windowHeight: number;
  scale: ReaderScale;
  quality: ReaderQuality;
  initialPage: number;
  onPageChange: (page: number) => void;
  onToggleChrome: () => void;
  footer: ReactElement;
}) {
  const listRef = useRef<FlatList<string>>(null);
  const didRetry = useRef(false);
  const initialIndex =
    pages.length > 0 ? Math.min(initialPage, pages.length - 1) : 0;
  // The initial scroll can report page 0 before it lands; do not persist that.
  const pendingRestore = useRef(initialIndex > 0);
  const [zoomed, setZoomed] = useState(false);
  const [footerReady, setFooterReady] = useState(pages.length === 0);
  const markFooterReady = useCallback(() => setFooterReady(true), []);
  const [onViewableItemsChanged] = useState(
    () =>
      ({ viewableItems }: { viewableItems: ListViewToken[] }) => {
        const index = viewableItems[0]?.index;

        if (index == null) {
          return;
        }

        if (pendingRestore.current) {
          if (index === 0) {
            return;
          }

          pendingRestore.current = false;
        }

        onPageChange(index);
      },
  );
  const pageHeight = width / PAGE_HEIGHT_RATIO;
  const getItemLayout = useCallback(
    (_: ArrayLike<string> | null | undefined, index: number) => ({
      length: pageHeight,
      offset: pageHeight * index,
      index,
    }),
    [pageHeight],
  );
  const [viewabilityConfig] = useState(() => ({
    // Webtoon pages can be taller than the viewport, so half of a page is not
    // always reachable; a low threshold keeps the reported page moving.
    itemVisiblePercentThreshold: 10,
  }));

  const onScrollToIndexFailed = (info: {
    index: number;
    averageItemLength: number;
  }) => {
    if (didRetry.current) {
      return;
    }
    didRetry.current = true;
    listRef.current?.scrollToOffset({
      offset: info.averageItemLength * info.index,
      animated: false,
    });
    setTimeout(() => {
      listRef.current?.scrollToIndex({ index: info.index, animated: false });
    }, 120);
  };

  const goToPage = (index: number) => {
    if (index < 0 || index >= pages.length) {
      return;
    }

    listRef.current?.scrollToIndex({ index, animated: true });
  };

  return (
    <FlatList
      ref={listRef}
      data={pages}
      keyExtractor={(item) => item}
      renderItem={({ item, index }) => (
        <ReaderPage
          uri={item}
          label={`Página ${index + 1}`}
          width={width}
          height={windowHeight}
          scaleMode={scale}
          quality={quality}
          paged={false}
          onTap={() => onToggleChrome()}
          onZoomChange={setZoomed}
          onReady={index < pages.length - 1 ? undefined : markFooterReady}
          onNextPage={
            zoomed || index >= pages.length - 1
              ? undefined
              : () => goToPage(index + 1)
          }
          onPreviousPage={
            zoomed || index === 0 ? undefined : () => goToPage(index - 1)
          }
        />
      )}
      ListFooterComponent={
        footerReady ? (
          footer
        ) : (
          <View className="items-center py-8">
            <ActivityIndicator color="#a1a1aa" />
          </View>
        )
      }
      showsVerticalScrollIndicator={false}
      scrollEnabled={!zoomed}
      removeClippedSubviews={false}
      onScrollToIndexFailed={onScrollToIndexFailed}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfig}
      getItemLayout={getItemLayout}
      initialScrollIndex={pages.length > 0 ? initialIndex : undefined}
      initialNumToRender={2}
      maxToRenderPerBatch={3}
      windowSize={5}
    />
  );
}
