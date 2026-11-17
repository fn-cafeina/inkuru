import { mock } from 'bun:test';

import { createFakeFileSystem } from './fileSystem';

/** Shared setup for the download manager checks: fake disk, storage and net. */

export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

export function assertEqual<T>(actual: T, expected: T, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

/** The queue is fire-and-forget; poll until the state the test expects lands. */
export async function waitFor(
  predicate: () => boolean,
  label: string,
): Promise<void> {
  const started = Date.now();

  while (!predicate()) {
    if (Date.now() - started > 5000) {
      throw new Error(`timeout: ${label}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

export const fake = createFakeFileSystem();
export const storage = new Map<string, string>();

const asyncStorage = {
  getItem: async (key: string) => storage.get(key) ?? null,
  setItem: async (key: string, value: string) => {
    storage.set(key, value);
  },
  removeItem: async (key: string) => {
    storage.delete(key);
  },
  getAllKeys: async () => [...storage.keys()],
  multiGet: async (keys: string[]) =>
    keys.map((key) => [key, storage.get(key) ?? null] as const),
  multiRemove: async (keys: string[]) => {
    for (const key of keys) {
      storage.delete(key);
    }
  },
};

/** Network stub: swap `fetchImpl` per scenario; `calls` counts fetches. */
export const net = {
  calls: 0,
  fetchImpl: async (
    _path: string,
    _signal?: AbortSignal,
  ): Promise<unknown> => {
    throw new Error('unexpected network call');
  },
};

mock.module('expo-file-system', () => fake.module);
mock.module('@react-native-async-storage/async-storage', () => ({
  default: asyncStorage,
}));
mock.module('../../source/zonatmo', () => ({
  fetchReader: (path: string, signal?: AbortSignal) => {
    net.calls += 1;

    return net.fetchImpl(path, signal);
  },
}));

export const manager = await import('../manager');
