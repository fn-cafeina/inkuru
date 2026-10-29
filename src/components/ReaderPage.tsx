import { useEffect, useRef, useState } from 'react';
import type { AccessibilityActionInfo } from 'react-native';
import { PixelRatio, Text, View } from 'react-native';
import {
  GestureDetector,
  useExclusiveGestures,
  usePanGesture,
  usePinchGesture,
  useSimultaneousGestures,
  useTapGesture,
} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Image } from 'expo-image';

import type { ReaderQuality, ReaderScale } from '../storage/readerSettings';
import { READER_PAGE_ASPECT_RATIO } from '../theme/layout';
import { AppPressable } from './AppPressable';
import { clamp, translationBounds, zoomAroundPoint } from './readerZoom';

const MAX_ZOOM = 4;
const DOUBLE_TAP_ZOOM = 2;
// Below this, releasing a pinch snaps back to the fitted page.
const RESET_THRESHOLD = 1.05;
const SETTLE_DURATION = 180;
// Lets a one-axis pan win over the surrounding scroll view only after the
// finger clearly left the touch slop.
const PAN_OFFSET: [number, number] = [-8, 8];

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

type SourceSize = { width: number; height: number };

/**
 * Page box in points. Paged mode honours the page-fitting preference;
 * continuous mode always uses the full width so pages stack without gaps.
 */
function pageBox({
  ratio,
  width,
  height,
  source,
  scaleMode,
  paged,
}: {
  ratio: number;
  width: number;
  height: number;
  source: SourceSize | null;
  scaleMode: ReaderScale;
  paged: boolean;
}): { baseWidth: number; baseHeight: number } {
  const fitWidth = width;
  const fitHeight = width / ratio;

  if (!paged) {
    return { baseWidth: fitWidth, baseHeight: fitHeight };
  }

  switch (scaleMode) {
    case 'fit-width':
      return { baseWidth: fitWidth, baseHeight: fitHeight };
    case 'fit-height':
      return { baseWidth: height * ratio, baseHeight: height };
    case 'fill':
      // Cover the viewport and crop the overflow.
      return ratio >= width / height
        ? { baseWidth: height * ratio, baseHeight: height }
        : { baseWidth: fitWidth, baseHeight: fitHeight };
    case 'original': {
      // Physical pixels mapped back to points, so nothing is upscaled.
      const density = PixelRatio.get();

      return {
        baseWidth: (source?.width ?? width) / density,
        baseHeight: (source?.height ?? height) / density,
      };
    }
    case 'stretch':
      return { baseWidth: width, baseHeight: height };
    case 'fit-screen':
    default:
      return ratio >= width / height
        ? { baseWidth: fitWidth, baseHeight: fitHeight }
        : { baseWidth: height * ratio, baseHeight: height };
  }
}

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
  const [zoomed, setZoomed] = useState(false);
  const zoomedRef = useRef(false);

  const ratio = source ? source.width / source.height : READER_PAGE_ASPECT_RATIO;
  // Zoom is applied around the viewport centre, so the focal point is
  // expressed relative to it.
  const viewportWidth = width;
  const viewportHeight = paged ? height : width / ratio;
  const { baseWidth, baseHeight } = pageBox({
    ratio,
    width,
    height,
    source,
    scaleMode,
    paged,
  });
  const overflowsX = baseWidth > viewportWidth + 0.5;
  const overflowsY = baseHeight > viewportHeight + 0.5;

  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);
  const startScale = useSharedValue(1);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startFocalX = useSharedValue(0);
  const startFocalY = useSharedValue(0);

  const notifyZoom = (next: boolean) => {
    zoomedRef.current = next;
    setZoomed(next);
    onZoomChange(next);
  };

  // A row can be recycled while zoomed (list windowing, data reload); release
  // the parent's scroll lock so the list does not stay frozen.
  useEffect(
    () => () => {
      if (zoomedRef.current) {
        onZoomChange(false);
      }
    },
    [onZoomChange],
  );

  const settle = () => {
    'worklet';

    savedScale.value = scale.value;
    savedX.value = translateX.value;
    savedY.value = translateY.value;

    if (scale.value <= RESET_THRESHOLD) {
      scale.value = withTiming(1, { duration: SETTLE_DURATION });
      translateX.value = withTiming(0, { duration: SETTLE_DURATION });
      translateY.value = withTiming(0, { duration: SETTLE_DURATION });
      savedScale.value = 1;
      savedX.value = 0;
      savedY.value = 0;
      runOnJS(notifyZoom)(false);

      return;
    }

    const bounds = translationBounds(
      baseWidth,
      baseHeight,
      viewportWidth,
      viewportHeight,
      scale.value,
    );
    const x = clamp(translateX.value, -bounds.maxX, bounds.maxX);
    const y = clamp(translateY.value, -bounds.maxY, bounds.maxY);

    translateX.value = withTiming(x, { duration: SETTLE_DURATION });
    translateY.value = withTiming(y, { duration: SETTLE_DURATION });
    savedX.value = x;
    savedY.value = y;
    runOnJS(notifyZoom)(true);
  };

  const pinch = usePinchGesture({
    onActivate: (event) => {
      startScale.value = savedScale.value;
      startX.value = savedX.value;
      startY.value = savedY.value;
      startFocalX.value = event.focalX - viewportWidth / 2;
      startFocalY.value = event.focalY - viewportHeight / 2;
    },
    onUpdate: (event) => {
      const nextScale = clamp(startScale.value * event.scale, 1, MAX_ZOOM);
      const next = zoomAroundPoint(
        startScale.value,
        startX.value,
        startY.value,
        startFocalX.value,
        startFocalY.value,
        event.focalX - viewportWidth / 2,
        event.focalY - viewportHeight / 2,
        nextScale,
      );
      const bounds = translationBounds(
        baseWidth,
        baseHeight,
        viewportWidth,
        viewportHeight,
        nextScale,
      );

      scale.value = nextScale;
      translateX.value = clamp(next.x, -bounds.maxX, bounds.maxX);
      translateY.value = clamp(next.y, -bounds.maxY, bounds.maxY);
    },
    onFinalize: settle,
  });

  const pan = usePanGesture({
    enabled: zoomed || overflowsX || overflowsY,
    // Two fingers belong to the pinch; panning is a one-finger gesture.
    maxPointers: 1,
    activeOffsetY: !zoomed && overflowsY && !overflowsX ? PAN_OFFSET : undefined,
    activeOffsetX: !zoomed && overflowsX && !overflowsY ? PAN_OFFSET : undefined,
    onUpdate: (event) => {
      const bounds = translationBounds(
        baseWidth,
        baseHeight,
        viewportWidth,
        viewportHeight,
        scale.value,
      );

      translateX.value = clamp(
        savedX.value + event.translationX,
        -bounds.maxX,
        bounds.maxX,
      );
      translateY.value = clamp(
        savedY.value + event.translationY,
        -bounds.maxY,
        bounds.maxY,
      );
    },
    // Also on cancellation: the next pan must start from the visible offset.
    onFinalize: () => {
      savedX.value = translateX.value;
      savedY.value = translateY.value;
    },
  });

  const doubleTap = useTapGesture({
    numberOfTaps: 2,
    maxDelay: 250,
    onDeactivate: (event) => {
      if (event.canceled) {
        return;
      }

      const focalX = event.x - viewportWidth / 2;
      const focalY = event.y - viewportHeight / 2;

      if (scale.value > RESET_THRESHOLD) {
        scale.value = withTiming(1, { duration: SETTLE_DURATION });
        translateX.value = withTiming(0, { duration: SETTLE_DURATION });
        translateY.value = withTiming(0, { duration: SETTLE_DURATION });
        savedScale.value = 1;
        savedX.value = 0;
        savedY.value = 0;
        runOnJS(notifyZoom)(false);

        return;
      }

      const nextScale = DOUBLE_TAP_ZOOM;
      const next = zoomAroundPoint(
        scale.value,
        translateX.value,
        translateY.value,
        focalX,
        focalY,
        focalX,
        focalY,
        nextScale,
      );
      const bounds = translationBounds(
        baseWidth,
        baseHeight,
        viewportWidth,
        viewportHeight,
        nextScale,
      );
      const x = clamp(next.x, -bounds.maxX, bounds.maxX);
      const y = clamp(next.y, -bounds.maxY, bounds.maxY);

      scale.value = withTiming(nextScale, { duration: SETTLE_DURATION });
      translateX.value = withTiming(x, { duration: SETTLE_DURATION });
      translateY.value = withTiming(y, { duration: SETTLE_DURATION });
      savedScale.value = nextScale;
      savedX.value = x;
      savedY.value = y;
      runOnJS(notifyZoom)(true);
    },
  });

  const singleTap = useTapGesture({
    numberOfTaps: 1,
    maxDelay: 250,
    onDeactivate: (event) => {
      if (!event.canceled) {
        runOnJS(onTap)(event.x);
      }
    },
  });

  const taps = useExclusiveGestures(doubleTap, singleTap);
  const gesture = useSimultaneousGestures(pinch, pan, taps);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const actions: AccessibilityActionInfo[] = [];

  if (onNextPage) {
    actions.push({ name: 'increment', label: 'Página siguiente' });
  }

  if (onPreviousPage) {
    actions.push({ name: 'decrement', label: 'Página anterior' });
  }

  return (
    <GestureDetector gesture={gesture}>
      <View
        className="bg-zinc-200 dark:bg-zinc-800"
        style={{
          width: viewportWidth,
          height: viewportHeight,
          overflow: paged ? 'hidden' : 'visible',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {failed ? (
          <AppPressable
            accessibilityLabel={`${label}, no se pudo cargar. Reintentar`}
            onPress={() => {
              setFailed(false);
              setAttempt((current) => current + 1);
            }}
            style={
              paged
                ? { width: '100%', height: '100%' }
                : { width, height: baseHeight }
            }
            className="items-center justify-center px-6"
          >
            <Text className="text-center text-xs text-zinc-600 dark:text-zinc-400">
              No se pudo cargar. Toca para reintentar.
            </Text>
          </AppPressable>
        ) : (
          <Animated.View
            style={[{ width: baseWidth, height: baseHeight }, animatedStyle]}
          >
            <Image
              key={attempt}
              source={{ uri }}
              style={{ width: baseWidth, height: baseHeight }}
              contentFit={source ? 'fill' : 'contain'}
              cachePolicy="memory-disk"
              // `original` and the sharper quality tiers decode the full
              // bitmap; `balanced` downsamples to the view size.
              allowDownscaling={
                quality === 'balanced' && scaleMode !== 'original'
              }
              transition={150}
              onLoad={(event) => {
                const { width: sourceWidth, height: sourceHeight } =
                  event.source;

                if (sourceWidth > 0 && sourceHeight > 0) {
                  setSource({ width: sourceWidth, height: sourceHeight });
                }
              }}
              onError={() => setFailed(true)}
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
        )}
      </View>
    </GestureDetector>
  );
}
