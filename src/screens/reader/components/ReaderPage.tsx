import { useState } from 'react';
import type { AccessibilityActionInfo } from 'react-native';
import { ActivityIndicator, Text, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { Image } from 'expo-image';

import type { ReaderQuality, ReaderScale } from '../../../storage/readerSettings';
import { READER_PAGE_ASPECT_RATIO } from '../../../theme/layout';
import { AppPressable } from '../../../components/AppPressable';
import { pageBox } from '../readerPageLayout';
import type { SourceSize } from '../readerPageLayout';
import { usePageGestures } from '../usePageGestures';

type Props = {
  uri: string;
  label: string;
  width: number;
  /** Window height; ignored in continuous (webtoon) mode. */
  height: number;
  scaleMode: ReaderScale;
  quality: ReaderQuality;
  paged: boolean;
  onTap: (x: number) => void;
  onZoomChange: (zoomed: boolean) => void;
  onNextPage?: () => void;
  onPreviousPage?: () => void;
};

export function ReaderPage({
  uri,
  label,
  width,
  height,
  scaleMode,
  quality,
  paged,
  onTap,
  onZoomChange,
  onNextPage,
  onPreviousPage,
}: Props) {
  const [source, setSource] = useState<SourceSize | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const ratio = source ? source.width / source.height : READER_PAGE_ASPECT_RATIO;
  // Zoom is applied around the viewport centre, so the focal point is
  // expressed relative to it.
  const viewportWidth = width;
  const viewportHeight = paged ? height : width / ratio;
  const { baseWidth, baseHeight } = pageBox({
    ratio,
    width,
    height,
    scaleMode,
    paged,
  });
  const overflowsX = baseWidth > viewportWidth + 0.5;
  const overflowsY = baseHeight > viewportHeight + 0.5;
  const { gesture, animatedStyle, zoomed, resetZoom } = usePageGestures({
    baseWidth,
    baseHeight,
    viewportWidth,
    viewportHeight,
    overflowsX,
    overflowsY,
    onTap,
    onZoomChange,
  });

  const actions: AccessibilityActionInfo[] = [];

  if (onNextPage) {
    actions.push({ name: 'increment', label: 'Página siguiente' });
  }

  if (onPreviousPage) {
    actions.push({ name: 'decrement', label: 'Página anterior' });
  }

  return (
    <View
      className="bg-zinc-950"
      style={{
        width: viewportWidth,
        height: viewportHeight,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {failed ? (
        <AppPressable
          accessibilityLabel={`${label}, no se pudo cargar. Reintentar`}
          onPress={() => {
            setFailed(false);
            setLoaded(false);
            setAttempt((current) => current + 1);
          }}
          style={
            paged
              ? { width: '100%', height: '100%' }
              : { width, height: baseHeight }
          }
          className="items-center justify-center px-4"
        >
          <Text className="text-center text-xs text-zinc-300">
            No se pudo cargar. Toca para reintentar.
          </Text>
        </AppPressable>
      ) : (
        <>
          <GestureDetector gesture={gesture}>
            <View style={{ width: baseWidth, height: baseHeight }}>
              {loaded ? null : (
                <View
                  accessible={false}
                  importantForAccessibility="no-hide-descendants"
                  pointerEvents="none"
                  className="absolute inset-0 items-center justify-center bg-zinc-900"
                >
                  <ActivityIndicator color="#a1a1aa" />
                </View>
              )}
              <Animated.View
                style={[
                  { width: baseWidth, height: baseHeight },
                  animatedStyle,
                ]}
              >
                <Image
                  key={attempt}
                  source={{ uri }}
                  style={{ width: baseWidth, height: baseHeight }}
                  contentFit="fill"
                  cachePolicy="memory-disk"
                  recyclingKey={uri}
                  transition={100}
                  // `balanced` downsamples to the view size; `original`
                  // decodes the full bitmap.
                  allowDownscaling={quality === 'balanced'}
                  onLoad={(event) => {
                    const { width: sourceWidth, height: sourceHeight } =
                      event.source;

                    if (sourceWidth > 0 && sourceHeight > 0) {
                      setSource({ width: sourceWidth, height: sourceHeight });
                    }

                    setLoaded(true);
                  }}
                  onError={() => {
                    setFailed(true);
                    setLoaded(false);
                  }}
                  accessible
                  accessibilityLabel={label}
                  accessibilityActions={actions}
                  onAccessibilityAction={(event) => {
                    if (event.nativeEvent.actionName === 'increment') {
                      onNextPage?.();
                    } else if (event.nativeEvent.actionName === 'decrement') {
                      onPreviousPage?.();
                    }
                  }}
                />
              </Animated.View>
            </View>
          </GestureDetector>
          {zoomed ? (
            <View
              pointerEvents="box-none"
              className="absolute left-0 right-0 top-4 items-center"
            >
              <AppPressable
                accessibilityLabel="Restablecer zoom"
                onPress={resetZoom}
                className="rounded-full px-4 py-2"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
              >
                <Text className="text-xs font-medium text-white">
                  Restablecer zoom
                </Text>
              </AppPressable>
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}
