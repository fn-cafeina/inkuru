import AsyncStorage from '@react-native-async-storage/async-storage';

import { withLock } from './serialize';

const PREFIX = 'cache:query:';
const ENTRY_PREFIX = `${PREFIX}v1:`;
const VERSION = 1;
const MAX_ENTRIES = 200;
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export const CACHE_FRESH_MS = {
  catalog: 10 * 60 * 1000,
  manga: 15 * 60 * 1000,
  chapter: 24 * 60 * 60 * 1000,
} as const;

type IndexEntry = { key: string; savedAt: number; bytes: number };
type StoredEntry = { v: number; savedAt: number; value: unknown };

const QUEUE_KEY = 'cache:query';

let index: IndexEntry[] | null = null;
let swept = false;

function storageKey(key: string) {
  return `${ENTRY_PREFIX}${encodeURIComponent(key)}`;
}

function isStoredEntry(value: unknown): value is StoredEntry {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    record.v === VERSION &&
    typeof record.savedAt === 'number' &&
    Number.isFinite(record.savedAt) &&
    'value' in record
  );
}

async function rebuildIndex(): Promise<IndexEntry[]> {
  const keys = await AsyncStorage.getAllKeys().catch(() => []);
  const entries: IndexEntry[] = [];

  for (const key of keys) {
    if (!key.startsWith(ENTRY_PREFIX)) {
      continue;
    }

    const raw = await AsyncStorage.getItem(key).catch(() => null);

    if (!raw) {
      continue;
    }

    try {
      const parsed: unknown = JSON.parse(raw);

      if (!isStoredEntry(parsed)) {
        continue;
      }

      entries.push({
        key: decodeURIComponent(key.slice(ENTRY_PREFIX.length)),
        savedAt: parsed.savedAt,
        bytes: raw.length,
      });
    } catch {
      // Skip unreadable entries; pruning will eventually clear them.
    }
  }

  index = entries;

  return entries;
}

/**
 * The index is rebuilt from the entries on disk on first use: a debounced
 * index copy can lag behind the entries after a crash, and the orphan sweep
 * would then delete valid entries as unknown.
 */
async function loadIndex(): Promise<IndexEntry[]> {
  if (index) {
    return index;
  }

  return rebuildIndex();
}

async function prune(entries: IndexEntry[]): Promise<IndexEntry[]> {
  const cutoff = Date.now() - MAX_AGE_MS;
  const expired = entries
    .filter((entry) => entry.savedAt < cutoff)
    .map((entry) => entry.key);
  const next = entries
    .filter((entry) => entry.savedAt >= cutoff)
    .sort((a, b) => a.savedAt - b.savedAt);
  let bytes = next.reduce((sum, entry) => sum + entry.bytes, 0);
  const removed: string[] = [];

  while (next.length > MAX_ENTRIES || bytes > MAX_BYTES) {
    const oldest = next.shift();

    if (!oldest) {
      break;
    }

    bytes -= oldest.bytes;
    removed.push(oldest.key);
  }

  const stale = [...expired, ...removed].map(storageKey);

  if (stale.length > 0) {
    await AsyncStorage.multiRemove(stale).catch(() => undefined);
  }

  return next;
}

/**
 * Cache entries with no index entry are deleted as orphans. Pure so the
 * self-check can prove a stale index no longer decides deletions.
 */
export function findOrphans(
  keys: readonly string[],
  entries: readonly IndexEntry[],
): string[] {
  const known = new Set(entries.map((entry) => storageKey(entry.key)));

  return keys.filter(
    (key) => key.startsWith(ENTRY_PREFIX) && !known.has(key),
  );
}

async function sweepOnce() {
  if (swept) {
    return;
  }

  const keys = await AsyncStorage.getAllKeys().catch(() => null);

  if (!keys) {
    return;
  }

  swept = true;
  const orphans = findOrphans(keys, index ?? []);

  if (orphans.length > 0) {
    await AsyncStorage.multiRemove(orphans).catch(() => undefined);
  }
}

export async function readCache<T>(
  key: string,
  validate: (value: unknown) => value is T,
): Promise<{ value: T; savedAt: number } | null> {
  // Invalidation is queued; wait so a read cannot resurrect what a delete removed.
  await withLock(QUEUE_KEY, async () => undefined);

  const raw = await AsyncStorage.getItem(storageKey(key)).catch(() => null);

  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (
      !isStoredEntry(parsed) ||
      Date.now() - parsed.savedAt > MAX_AGE_MS ||
      !validate(parsed.value)
    ) {
      void removeCache(key);
      return null;
    }

    return { value: parsed.value, savedAt: parsed.savedAt };
  } catch {
    void removeCache(key);
    return null;
  }
}

export function writeCache(key: string, value: unknown): void {
  void withLock(QUEUE_KEY, async () => {
    try {
      const savedAt = Date.now();
      const raw = JSON.stringify({ v: VERSION, savedAt, value });
      await AsyncStorage.setItem(storageKey(key), raw);
      const entries = (await loadIndex()).filter((entry) => entry.key !== key);

      entries.push({ key, savedAt, bytes: raw.length });
      index = await prune(entries);
      await sweepOnce();
    } catch {
      // The cache is best-effort; a failed write must not break the screen.
    }
  });
}

export function removeCache(key: string): Promise<void> {
  return withLock(QUEUE_KEY, async () => {
    try {
      await AsyncStorage.removeItem(storageKey(key));
      const entries = await loadIndex();
      index = entries.filter((entry) => entry.key !== key);
    } catch {
      // Ignore: stale entries are pruned later.
    }
  });
}
