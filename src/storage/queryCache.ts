import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'cache:query:';
const ENTRY_PREFIX = `${PREFIX}v1:`;
const INDEX_KEY = `${PREFIX}index`;
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

let index: IndexEntry[] | null = null;
let tail: Promise<void> = Promise.resolve();
let swept = false;

function storageKey(key: string) {
  return `${ENTRY_PREFIX}${encodeURIComponent(key)}`;
}

function isIndexEntry(value: unknown): value is IndexEntry {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.key === 'string' &&
    typeof record.savedAt === 'number' &&
    Number.isFinite(record.savedAt) &&
    typeof record.bytes === 'number' &&
    Number.isFinite(record.bytes)
  );
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

function enqueue(operation: () => Promise<void>): Promise<void> {
  const next = tail.then(operation, operation);
  tail = next.catch(() => undefined);
  return next;
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
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(entries)).catch(
    () => undefined,
  );

  return entries;
}

async function loadIndex(): Promise<IndexEntry[]> {
  if (index) {
    return index;
  }

  const raw = await AsyncStorage.getItem(INDEX_KEY).catch(() => null);

  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);

      if (Array.isArray(parsed) && parsed.every(isIndexEntry)) {
        index = parsed;
        return index;
      }
    } catch {
      // Rebuild below.
    }
  }

  return rebuildIndex();
}

async function persistIndex(entries: IndexEntry[]) {
  index = entries;
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(entries)).catch(
    () => undefined,
  );
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

async function sweepOnce() {
  if (swept) {
    return;
  }

  const keys = await AsyncStorage.getAllKeys().catch(() => null);

  if (!keys) {
    return;
  }

  swept = true;
  const known = new Set((index ?? []).map((entry) => storageKey(entry.key)));
  const orphans = keys.filter(
    (key) => key.startsWith(ENTRY_PREFIX) && !known.has(key),
  );

  if (orphans.length > 0) {
    await AsyncStorage.multiRemove(orphans).catch(() => undefined);
  }
}

export async function readCache<T>(
  key: string,
  validate: (value: unknown) => value is T,
): Promise<{ value: T; savedAt: number } | null> {
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
  void enqueue(async () => {
    try {
      const savedAt = Date.now();
      const raw = JSON.stringify({ v: VERSION, savedAt, value });
      await AsyncStorage.setItem(storageKey(key), raw);
      const entries = (await loadIndex()).filter((entry) => entry.key !== key);

      entries.push({ key, savedAt, bytes: raw.length });
      await persistIndex(await prune(entries));
      await sweepOnce();
    } catch {
      // The cache is best-effort; a failed write must not break the screen.
    }
  });
}

export function removeCache(key: string): Promise<void> {
  return enqueue(async () => {
    try {
      await AsyncStorage.removeItem(storageKey(key));
      const entries = await loadIndex();
      await persistIndex(entries.filter((entry) => entry.key !== key));
    } catch {
      // Ignore: stale entries are pruned later.
    }
  });
}

export function clearQueryCache(): Promise<void> {
  return enqueue(async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const ours = keys.filter((key) => key.startsWith(PREFIX));

      if (ours.length > 0) {
        await AsyncStorage.multiRemove(ours);
      }
    } catch {
      // Even if listing fails, reset the index below.
    }

    await persistIndex([]);
  });
}
