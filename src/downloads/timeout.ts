/** Aborts the shared run when a task takes longer than `ms`. */
export function withTimeout<T>(
  controller: AbortController,
  ms: number,
  task: () => Promise<T>,
): Promise<T> {
  const timer = setTimeout(() => controller.abort(), ms);

  // Promise.resolve() keeps the timer tied to the settle path even when the
  // task throws synchronously, which would otherwise leak an abort later.
  return Promise.resolve()
    .then(task)
    .finally(() => clearTimeout(timer));
}
