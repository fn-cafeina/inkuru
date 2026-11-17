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
  useDerivedValue,
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

type ZoomState = {
  scale: SharedValue<number>;
  savedScale: SharedValue<number>;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  savedX: SharedValue<number>;
  savedY: SharedValue<number>;
};

/**
 * Settle the zoom into its bounds. Below the reset threshold the page springs
 * back to 1x, otherwise the translation is clamped. Returns whether the page
 * stays zoomed.
 */
function settleZoom(
  baseWidth: number,
  baseHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  zoom: ZoomState,
): boolean {
  'worklet';

  zoom.savedScale.value = zoom.scale.value;
  zoom.savedX.value = zoom.translateX.value;
  zoom.savedY.value = zoom.translateY.value;

  if (zoom.scale.value <= RESET_THRESHOLD) {
    zoom.scale.value = withTiming(1, { duration: SETTLE_DURATION });
    zoom.translateX.value = withTiming(0, { duration: SETTLE_DURATION });
    zoom.translateY.value = withTiming(0, { duration: SETTLE_DURATION });
    zoom.savedScale.value = 1;
    zoom.savedX.value = 0;
    zoom.savedY.value = 0;

    return false;
  }

  const bounds = translationBounds(
    baseWidth,
    baseHeight,
    viewportWidth,
    viewportHeight,
    zoom.scale.value,
  );
  const x = clamp(zoom.translateX.value, -bounds.maxX, bounds.maxX);
  const y = clamp(zoom.translateY.value, -bounds.maxY, bounds.maxY);

  zoom.translateX.value = withTiming(x, { duration: SETTLE_DURATION });
  zoom.translateY.value = withTiming(y, { duration: SETTLE_DURATION });
  zoom.savedX.value = x;
  zoom.savedY.value = y;

  return true;
}

/**
 * Double tap: zoom to DOUBLE_TAP_ZOOM around the tap, or back to 1x when
 * already zoomed. Returns the resulting zoomed state.
 */
function doubleTapToZoom(
  baseWidth: number,
  baseHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  zoom: ZoomState,
  focalX: number,
  focalY: number,
): boolean {
  'worklet';

  if (zoom.scale.value > RESET_THRESHOLD) {
    return settleZoom(baseWidth, baseHeight, viewportWidth, viewportHeight, zoom);
  }

  const next = zoomAroundPoint(
    zoom.scale.value,
    zoom.translateX.value,
    zoom.translateY.value,
    focalX,
    focalY,
    focalX,
    focalY,
    DOUBLE_TAP_ZOOM,
  );
  const bounds = translationBounds(
    baseWidth,
    baseHeight,
    viewportWidth,
    viewportHeight,
    DOUBLE_TAP_ZOOM,
  );
  const x = clamp(next.x, -bounds.maxX, bounds.maxX);
  const y = clamp(next.y, -bounds.maxY, bounds.maxY);

  zoom.scale.value = withTiming(DOUBLE_TAP_ZOOM, { duration: SETTLE_DURATION });
  zoom.translateX.value = withTiming(x, { duration: SETTLE_DURATION });
  zoom.translateY.value = withTiming(y, { duration: SETTLE_DURATION });
  zoom.savedScale.value = DOUBLE_TAP_ZOOM;
  zoom.savedX.value = x;
  zoom.savedY.value = y;

  return true;
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
  /** Webtoon mode: the scale is shared with every page in the column, so a
   * pinch zooms the whole scroll instead of one image. */
  sharedZoom?: { scale: SharedValue<number>; savedScale: SharedValue<number> };
};

export function usePageGestures({
  baseWidth,
  baseHeight,
  viewportWidth,
  viewportHeight,
  overflowsX,
  overflowsY,
  onTap,
  onZoomChange,
  sharedZoom,
}: Params) {
  const [zoomed, setZoomed] = useState(false);
  const zoomedRef = useRef(false);
  const ownScale = useSharedValue(1);
  const ownSavedScale = useSharedValue(1);
  const scale = sharedZoom?.scale ?? ownScale;
  const savedScale = sharedZoom?.savedScale ?? ownSavedScale;
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);
  const startScale = useSharedValue(1);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startFocalX = useSharedValue(0);
  const startFocalY = useSharedValue(0);
  // A shared scale is blind to other pages' pinches, so the pan gate reads it.
  const sharedZoomed = useDerivedValue(() => scale.value > RESET_THRESHOLD);
  const zoomState: ZoomState = {
    scale,
    savedScale,
    translateX,
    translateY,
    savedX,
    savedY,
  };

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

  const pinch = usePinchGesture({
    onActivate: (event) => {
      // Lock the surrounding scroll as soon as the pinch is recognized;
      // waiting for the reset threshold lets two-finger drags fight the list.
      runOnJS(notifyZoom)(true);
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
    onFinalize: () => {
      runOnJS(notifyZoom)(
        settleZoom(baseWidth, baseHeight, viewportWidth, viewportHeight, zoomState),
      );
    },
  });

  const pan = usePanGesture({
    enabled: sharedZoom ? sharedZoomed : zoomed || overflowsX || overflowsY,
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
    // Exclusivity means the single tap waits this long before advancing, so the
    // window is as short as a double tap can still fit in.
    // shortcut: counting taps in one gesture would drop the wait to zero; two
    // taps in 180ms is rare enough not to justify rewriting the gesture graph.
    maxDelay: 180,
    maxDistance: 12,
    onDeactivate: (event) => {
      if (event.canceled) {
        return;
      }

      runOnJS(notifyZoom)(
        doubleTapToZoom(
          baseWidth,
          baseHeight,
          viewportWidth,
          viewportHeight,
          zoomState,
          event.x - viewportWidth / 2,
          event.y - viewportHeight / 2,
        ),
      );
    },
  });

  const singleTap = useTapGesture({
    numberOfTaps: 1,
    maxDelay: 180,
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

  return { gesture, animatedStyle };
}
