/**
 * Dev-only trace for timing problems that only show up on a device: one line
 * per step, prefixed so `grep` on the Metro log finds them. `__DEV__` is
 * stripped in release builds, so these cost nothing there.
 */
export function trace(label: string, ...args: unknown[]): void {
  if (!__DEV__) {
    return;
  }

  console.log(`[trace] ${label}`, ...args);
}

/** Milliseconds since `startedAt`, for the same log lines. */
export function elapsed(startedAt: number): string {
  return `${Math.round(performance.now() - startedAt)}ms`;
}
