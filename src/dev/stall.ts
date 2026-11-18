/**
 * Dev-only event-loop watchdog.
 *
 * A long task on the JS thread is what a user feels as "the UI froze": touches
 * queue and nothing repaints until it ends.
 *
 * Gaps are counted and reported once per window instead of one line per gap.
 * Fast Refresh and Metro alone push past any sane threshold dozens of times a
 * minute; a summary says whether the screen actually stuttered, and how bad,
 * without burying the rest of the log. `__DEV__` is stripped in release.
 */
import { log } from './log';

const TICK_MS = 100;
// Below this the loop is just busy; above it the stall is felt as a freeze.
const STALL_MS = 200;
// One line per window at most, and only if something inside it stalled.
const WINDOW_MS = 10_000;

const IS_DEV = (globalThis as { __DEV__?: boolean }).__DEV__ === true;

export function watchStalls(): void {
  if (!IS_DEV) {
    return;
  }

  let last = Date.now();
  let windowStart = last;
  let count = 0;
  let worst = 0;
  let total = 0;

  setInterval(() => {
    const now = Date.now();
    const gap = now - last;

    last = now;

    if (gap > STALL_MS) {
      count += 1;
      total += gap;

      if (gap > worst) {
        worst = gap;
      }
    }

    const window = now - windowStart;

    if (window < WINDOW_MS) {
      return;
    }

    if (count > 0) {
      log.warn('js', 'stall', {
        over: `${Math.round(window / 1000)}s`,
        count,
        worst,
        total,
      });
    }

    windowStart = now;
    count = 0;
    worst = 0;
    total = 0;
  }, TICK_MS);
}
