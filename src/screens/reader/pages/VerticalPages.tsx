import { useCallback, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';
import type { ListViewToken } from 'react-native';

import type {
  ReaderQuality,
  ReaderScale,
} from '../../../storage/readerSettings';
import { reader } from '../../../theme/colors';
import { READER_PAGE_ASPECT_RATIO } from '../../../theme/layout';
import { ReaderPage } from '../components/ReaderPage';
import { pageLayoutAt } from '../readerPageLayout';

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
  // getItemLayout estimates a uniform height, but webtoon pages differ, so the
  // initial scroll lands near the target rather than on it. Reporting that
  // landing page would overwrite the saved position with the wrong one, so
  // nothing is reported until the target page is actually seen.
  const restoreRef = useRef({ pending: initialIndex > 0, retried: false });
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

        if (restoreRef.current.pending) {
          if (index === initialIndex) {
            restoreRef.current.pending = false;
          } else if (!restoreRef.current.retried) {
            // Landing short of the target: re-anchor once, then wait for the
            // target to scroll into view.
            restoreRef.current.retried = true;
            listRef.current?.scrollToIndex({
              index: initialIndex,
              animated: false,
            });
            return;
          } else {
            return;
          }
        }

        onPageChange(index);
      },
  );

  /** Estimated height until a page reports its real size. */
  const pageHeight = width / READER_PAGE_ASPECT_RATIO;
  // Real measured row heights; unmeasured indices fall back to the estimate.
  // getItemLayout reads the ref, so rows re-measuring (image load) propagate
  // without a re-render: VirtualizedList re-derives spacers on cell layout.
  const heightsRef = useRef<number[]>([]);
  const getItemLayout = useCallback(
    (_: ArrayLike<string> | null | undefined, index: number) =>
      pageLayoutAt(heightsRef.current, index, pageHeight),
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
    const heights = heightsRef.current;
    let measured = true;

    for (let i = 0; i <= info.index; i++) {
      if (heights[i] == null) {
        measured = false;
        break;
      }
    }

    if (measured) {
      // Every row up to the target is measured, so one offset lands exactly
      // instead of an estimated jump followed by a correction.
      listRef.current?.scrollToOffset({
        offset: pageLayoutAt(heights, info.index, pageHeight).offset,
        animated: false,
      });
      return;
    }

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
      keyExtractor={(_, index) => String(index)}
      renderItem={({ item, index }) => (
        <View
          onLayout={(event) => {
            heightsRef.current[index] = event.nativeEvent.layout.height;
          }}
        >
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
        </View>
      )}
      ListFooterComponent={
        footerReady ? (
          footer
        ) : (
          <View className="items-center py-8">
            <ActivityIndicator color={reader.textMuted} />
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
