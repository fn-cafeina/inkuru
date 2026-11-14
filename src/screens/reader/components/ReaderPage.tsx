import { useRef, useState } from 'react';
import type { AccessibilityActionInfo } from 'react-native';
import { ActivityIndicator, Text, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { Image } from 'expo-image';

import type { ReaderQuality, ReaderScale } from '../../../storage/readerSettings';
import { reader } from '../../../theme/colors';
import { AnimatedPressable } from '../../../components/AnimatedPressable';
import { knownPageRatio, pageBox, rememberPageRatio } from '../readerPageLayout';
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
  onReady?: () => void;
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
  onReady,
}: Props) {
  const [source, setSource] = useState<SourceSize | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const notified = useRef(false);
  const notifyReady = () => {
    if (!notified.current) {
      notified.current = true;
      onReady?.();
    }
  };

  // A remounted row starts at its measured proportion when the page was seen
  // before, so the row never resizes back to the estimate.
  const ratio = source ? source.width / source.height : knownPageRatio(uri);
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
  const { gesture, animatedStyle } = usePageGestures({
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
      style={{
        backgroundColor: reader.background,
        width: viewportWidth,
        height: viewportHeight,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {failed ? (
        <AnimatedPressable
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
          <Text className="text-center text-xs" style={{ color: reader.text }}>
            No se pudo cargar. Toca para reintentar.
          </Text>
        </AnimatedPressable>
      ) : (
        <GestureDetector gesture={gesture}>
          <View
            style={{
              width: viewportWidth,
              height: viewportHeight,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View style={{ width: baseWidth, height: baseHeight }}>
              {loaded ? null : (
                <View
                  accessible={false}
                  importantForAccessibility="no-hide-descendants"
                  pointerEvents="none"
                  className="absolute inset-0 items-center justify-center"
                  style={{ backgroundColor: reader.surface }}
                >
                  <ActivityIndicator color={reader.textMuted} />
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

                    rememberPageRatio(uri, {
                      width: sourceWidth,
                      height: sourceHeight,
                    });

                    if (sourceWidth > 0 && sourceHeight > 0) {
                      setSource({ width: sourceWidth, height: sourceHeight });
                    }

                    setLoaded(true);
                    notifyReady();
                  }}
                  onError={() => {
                    setFailed(true);
                    setLoaded(false);
                    notifyReady();
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
          </View>
        </GestureDetector>
      )}
    </View>
  );
}
