/**
 * Dev-only event-loop watchdog.
 *
 * A long task on the JS thread is what a user feels as "the UI froze": touches
 * queue and nothing repaints until it ends. This logs every gap the platform
 * cannot answer within, so a slow screen is blamed with a number instead of a
 * hunch. `__DEV__` is stripped in release builds.
 */
const TICK_MS = 100;
// Below this the loop is just busy; above it the stall is felt as jank.
const WARN_MS = 120;

const IS_DEV = (globalThis as { __DEV__?: boolean }).__DEV__ === true;

export function watchStalls(): void {
  if (!IS_DEV) {
    return;
  }

  let last = Date.now();

  setInterval(() => {
    const now = Date.now();
    const gap = now - last;

    last = now;

    if (gap > WARN_MS) {
      console.warn(`[stall] ${gap}ms`);
    }
  }, TICK_MS);
}
