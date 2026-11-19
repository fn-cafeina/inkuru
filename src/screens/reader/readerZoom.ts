// Standalone worklets so the gesture callbacks can share the same geometry
// without importing anything from React Native.

/** Clamps a value into the inclusive [min, max] range. */
export function clamp(value: number, min: number, max: number): number {
  'worklet';

  return Math.min(max, Math.max(min, value));
}

/** Double tap lands here; a pinch can land anywhere inside the range. */
export const DOUBLE_TAP_ZOOM = 2;

/** Below this the page counts as fitted, so a pinch release snaps back to 1x. */
export const RESET_THRESHOLD = 1.05;

/**
 * Double tap toggles: a zoomed page goes back to 1x, a fitted one zooms in.
 * Keeping the decision here instead of inside the gesture is what makes the
 * toggle testable.
 */
export function doubleTapScale(scale: number): number {
  'worklet';

  return scale > RESET_THRESHOLD ? 1 : DOUBLE_TAP_ZOOM;
}

/**
 * Maximum translation on each axis for a scaled box inside a viewport. The box
 * is centred, so each side can travel half of its overflow.
 */
export function translationBounds(
  baseWidth: number,
  baseHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  scale: number,
): { maxX: number; maxY: number } {
  'worklet';

  return {
    maxX: Math.max(0, (baseWidth * scale - viewportWidth) / 2),
    maxY: Math.max(0, (baseHeight * scale - viewportHeight) / 2),
  };
}

/**
 * Translation that keeps the content point under the pinch focal point fixed
 * while the scale changes from `scaleStart` to `nextScale`. Focal points are
 * relative to the viewport centre.
 */
export function zoomAroundPoint(
  scaleStart: number,
  xStart: number,
  yStart: number,
  focalStartX: number,
  focalStartY: number,
  focalX: number,
  focalY: number,
  nextScale: number,
): { x: number; y: number } {
  'worklet';

  const contentX = (focalStartX - xStart) / scaleStart;
  const contentY = (focalStartY - yStart) / scaleStart;

  return {
    x: focalX - contentX * nextScale,
    y: focalY - contentY * nextScale,
  };
}
