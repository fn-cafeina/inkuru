/** Aborts the shared run when a task takes longer than `ms`. */
export function withTimeout<T>(
  controller: AbortController,
  ms: number,
  task: () => Promise<T>,
): Promise<T> {
  const timer = setTimeout(() => controller.abort(), ms);

  return task().finally(() => clearTimeout(timer));
}
