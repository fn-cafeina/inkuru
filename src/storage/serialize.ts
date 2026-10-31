const tails = new Map<string, Promise<void>>();

/**
 * Runs tasks for the same key one after another, so concurrent
 * read-modify-write cycles cannot overwrite each other's result.
 */
export function withLock<T>(key: string, task: () => Promise<T>): Promise<T> {
  const tail = tails.get(key) ?? Promise.resolve();
  const next = tail.then(task, task);
  const settled = next.then(
    () => undefined,
    () => undefined,
  );

  tails.set(key, settled);

  void settled.then(() => {
    if (tails.get(key) === settled) {
      tails.delete(key);
    }
  });

  return next;
}
