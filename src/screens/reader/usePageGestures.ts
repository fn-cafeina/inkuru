import { useEffect, useRef, useState } from 'react';
import {
  useExclusiveGestures,
  usePanGesture,
  usePinchGesture,
  useSimultaneousGestures,
  useTapGesture,
} from 'react-native-gesture-handler';
import {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

import { clamp, translationBounds, zoomAroundPoint } from './readerZoom';

const MAX_ZOOM = 4;
const DOUBLE_TAP_ZOOM = 2;
// Below this, releasing a pinch snaps back to the fitted page.
const RESET_THRESHOLD = 1.05;
const SETTLE_DURATION = 180;
// Lets a one-axis pan win over the surrounding scroll view only after the
// finger clearly left the touch slop.
const PAN_OFFSET: [number, number] = [-8, 8];

function resetTransform(
  scale: SharedValue<number>,
  translateX: SharedValue<number>,
  translateY: SharedValue<number>,
  savedScale: SharedValue<number>,
  savedX: SharedValue<number>,
  savedY: SharedValue<number>,
) {
  scale.value = withTiming(1, { duration: SETTLE_DURATION });
  translateX.value = withTiming(0, { duration: SETTLE_DURATION });
  translateY.value = withTiming(0, { duration: SETTLE_DURATION });
  savedScale.value = 1;
  savedX.value = 0;
  savedY.value = 0;
}

type Params = {
  baseWidth: number;
  baseHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  overflowsX: boolean;
  overflowsY: boolean;
  onTap: (x: number) => void;
  onZoomChange: (zoomed: boolean) => void;
};

// eslint-disable-next-line max-lines-per-function -- the gesture worklets share one zoom state
export function usePageGestures({
  baseWidth,
  baseHeight,
  viewportWidth,
  viewportHeight,
  overflowsX,
  overflowsY,
  onTap,
  onZoomChange,
}: Params) {
  const [zoomed, setZoomed] = useState(false);
  const zoomedRef = useRef(false);
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
      runOnJS(onZoomChange)(true);
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
    maxDistance: 12,
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
    maxDistance: 12,
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

  const resetZoom = () => {
    resetTransform(scale, translateX, translateY, savedScale, savedX, savedY);
    notifyZoom(false);
  };

  return { gesture, animatedStyle, zoomed, resetZoom };
}
