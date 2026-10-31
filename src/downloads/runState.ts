export type RunTracker = {
  start: (chapterPath: string) => number;
  fail: (chapterPath: string) => void;
  cancel: (chapterPath: string) => void;
  consumeCancel: (chapterPath: string) => boolean;
  isCurrent: (chapterPath: string, generation: number) => boolean;
  canWrite: (chapterPath: string, generation: number) => boolean;
  finish: (chapterPath: string, generation: number) => void;
};

/**
 * A late write from a cancelled or deleted download must not resurrect its
 * record. Each run owns a generation; cancelling or deleting invalidates it.
 */
export function createRunTracker(): RunTracker {
  const generations = new Map<string, number>();
  const cancelled = new Set<string>();
  const failed = new Set<string>();

  const isCurrent = (chapterPath: string, generation: number) =>
    (generations.get(chapterPath) ?? 0) === generation;

  return {
    start(chapterPath) {
      const generation = (generations.get(chapterPath) ?? 0) + 1;

      generations.set(chapterPath, generation);
      cancelled.delete(chapterPath);
      failed.delete(chapterPath);

      return generation;
    },
    fail(chapterPath) {
      failed.add(chapterPath);
    },
    cancel(chapterPath) {
      cancelled.add(chapterPath);
      generations.set(chapterPath, (generations.get(chapterPath) ?? 0) + 1);
    },
    consumeCancel(chapterPath) {
      return cancelled.delete(chapterPath);
    },
    isCurrent,
    canWrite(chapterPath, generation) {
      return !failed.has(chapterPath) && isCurrent(chapterPath, generation);
    },
    finish(chapterPath, generation) {
      if (isCurrent(chapterPath, generation)) {
        generations.delete(chapterPath);
        failed.delete(chapterPath);
      }
    },
  };
}
