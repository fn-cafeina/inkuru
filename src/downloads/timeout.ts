/** Aborts the shared run when a task takes longer than `ms`. */
export function withTimeout<T>(
  controller: AbortController,
  ms: number,
  task: () => Promise<T>,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`timed out after ${ms}ms`));
    }, ms);

    // Promise.resolve() keeps the timer tied to the settle path even when the
    // task throws synchronously, which would otherwise leak an abort later.
    Promise.resolve()
      .then(task)
      .then(resolve, reject)
      .finally(() => clearTimeout(timer));
  });
}
