import { useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { FlatList, View } from 'react-native';
import type { ListViewToken } from 'react-native';

import type {
  ReaderQuality,
  ReaderScale,
} from '../../../storage/readerSettings';
import { ReaderPage } from '../components/ReaderPage';

export function PagedPages({
  pages,
  width,
  windowHeight,
  scale,
  quality,
  direction,
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
  direction: 'ltr' | 'rtl';
  initialPage: number;
  onPageChange: (page: number) => void;
  onToggleChrome: () => void;
  footer: ReactElement;
}) {
  const listRef = useRef<FlatList<string>>(null);
  const [zoomed, setZoomed] = useState(false);
  const [onViewableItemsChanged] = useState(
    () =>
      ({ viewableItems }: { viewableItems: ListViewToken[] }) => {
        const index = viewableItems[0]?.index;
        if (index != null && index < pages.length) {
          onPageChange(index);
        }
      },
  );
  const [viewabilityConfig] = useState(() => ({
    itemVisiblePercentThreshold: 50,
  }));

  const goToPage = (index: number) => {
    if (index < 0 || index >= pages.length) {
      return;
    }
    listRef.current?.scrollToIndex({ index, animated: true });
  };

  // Taps are resolved from the touch coordinate the page reports, so the pinch
  // and the double tap keep working over the edge zones.
  const handlePageTap = (x: number, index: number) => {
    if (zoomed) {
      return;
    }

    // Outer thirds advance; only the center third touches the chrome, so a
    // page-advance tap never reveals the controls.
    const edge = width / 3;
    // In RTL the left edge advances, mirroring the inverted list.
    const advancesRight = direction === 'ltr';

    if (advancesRight) {
      if (x > width - edge) {
        goToPage(index + 1);
      } else if (x < edge) {
        goToPage(index - 1);
      } else {
        onToggleChrome();
      }

      return;
    }

    if (x < edge) {
      goToPage(index + 1);
    } else if (x > width - edge) {
      goToPage(index - 1);
    } else {
      onToggleChrome();
    }
  };

  return (
    <FlatList
      ref={listRef}
      horizontal
      inverted={direction === 'rtl'}
      pagingEnabled
      data={pages}
      keyExtractor={(item) => item}
      getItemLayout={(_, index) => ({
        length: width,
        offset: width * index,
        index,
      })}
      initialScrollIndex={
        pages.length > 0 ? Math.min(initialPage, pages.length - 1) : undefined
      }
      renderItem={({ item, index }) => (
        <ReaderPage
          uri={item}
          label={`Página ${index + 1}`}
          width={width}
          height={windowHeight}
          scaleMode={scale}
          quality={quality}
          paged
          onTap={(x) => handlePageTap(x, index)}
          onZoomChange={setZoomed}
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
        <View style={{ width, height: windowHeight }} className="justify-center">
          {footer}
        </View>
      }
      scrollEnabled={!zoomed}
      removeClippedSubviews={false}
      showsHorizontalScrollIndicator={false}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfig}
      initialNumToRender={1}
      maxToRenderPerBatch={3}
      windowSize={5}
    />
  );
}
