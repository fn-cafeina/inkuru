import { mock } from 'bun:test';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual<T>(actual: T, expected: T, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

const storage = new Map<string, string>();

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

mock.module('@react-native-async-storage/async-storage', () => ({
  default: asyncStorage,
}));

const { findOrphans, readCache, writeCache } = await import('./queryCache');

const entry = (key: string) => ({ key, savedAt: 1, bytes: 10 });
const knownKey = 'cache:query:v1:reader%3A%2Fx';

// Entries written while the index lagged behind (killed before the flush)
// must not be swept: the index passed here is rebuilt from disk, not stale.
assert(
  findOrphans([knownKey, 'cache:query:v1:new-entry'], [entry('reader:/x')]).join() ===
    'cache:query:v1:new-entry',
  'only the unindexed entry is an orphan',
);

assert(
  findOrphans([knownKey], [entry('reader:/x')]).length === 0,
  'indexed entries are never orphans',
);

assert(
  findOrphans(['library:entries', 'reader:read:/x'], []).length === 0,
  'foreign keys are left alone',
);

assert(
  findOrphans(['cache:query:v1:a'], []).join() === 'cache:query:v1:a',
  'a cache entry with an empty index is an orphan',
);

// --- read and removal through the queue lock ---

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const storageKey = (key: string) => `cache:query:v1:${encodeURIComponent(key)}`;
const DAY = 24 * 60 * 60 * 1000;
const stored = (value: unknown, savedAt: number) =>
  JSON.stringify({ v: 1, savedAt, value });

storage.set(storageKey('reader:/x'), stored({ a: 1 }, Date.now() - 8 * DAY));
assertEqual(
  await readCache('reader:/x', isObject),
  null,
  'an expired entry reads as null',
);
assert(
  !storage.has(storageKey('reader:/x')),
  'an expired entry is removed from storage',
);

storage.set(storageKey('reader:/y'), stored({ a: 1 }, Date.now()));
assertEqual(
  (await readCache('reader:/y', isObject))?.value.a,
  1,
  'a fresh entry reads back',
);

storage.set(storageKey('reader:/bad'), '{roto');
assertEqual(
  await readCache('reader:/bad', isObject),
  null,
  'an unreadable entry reads as null',
);
assert(!storage.has(storageKey('reader:/bad')), 'an unreadable entry is removed');

storage.set(storageKey('reader:/wrong'), stored('cadena', Date.now()));
assertEqual(
  await readCache('reader:/wrong', isObject),
  null,
  'an entry failing the guard reads as null',
);
assert(
  !storage.has(storageKey('reader:/wrong')),
  'an entry failing the guard is removed',
);

writeCache('reader:/z', { a: 2 });
assertEqual(
  (await readCache('reader:/z', isObject))?.value.a,
  2,
  'a written entry reads back',
);

// The whole point of the lock: a write queued while an expired read is being
// decided must survive, because the removal belongs to the read's own task.
storage.set(storageKey('reader:/race'), stored({ old: true }, Date.now() - 8 * DAY));
const expired = readCache('reader:/race', isObject);
writeCache('reader:/race', { fresh: true });

assertEqual(await expired, null, 'the racing read still reports the expired value');
assertEqual(
  (await readCache('reader:/race', isObject))?.value.fresh,
  true,
  'the write queued behind the expired read survives',
);

console.log('query cache sweep ok');