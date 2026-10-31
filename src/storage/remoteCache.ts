import { removeCache } from './queryCache';

type CacheEntry = { value: unknown; savedAt: number };

// Stale-while-revalidate cache: remounts (stack push, replace, key change)
// show the last result instantly and revalidate in the background. Keys are
// evicted least-recently-written first so a long browsing session cannot grow
// the map without bound.
const CACHE_LIMIT = 50;
const cache = new Map<string, CacheEntry>();

export function readRemoteCache<T>(
  key: string | undefined,
): { value: T; savedAt: number } | undefined {
  if (key === undefined) {
    return undefined;
  }

  const entry = cache.get(key);

  if (!entry) {
    return undefined;
  }

  // Touch on read so hot keys survive eviction.
  cache.delete(key);
  cache.set(key, entry);

  return { value: entry.value as T, savedAt: entry.savedAt };
}

export function writeRemoteCache(
  key: string,
  value: unknown,
  savedAt: number,
) {
  cache.delete(key);
  cache.set(key, { value, savedAt });

  if (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next().value;

    if (oldest !== undefined) {
      cache.delete(oldest);
    }
  }
}

/** Drop a cached result, both in memory and on disk. */
export function forgetRemoteCache(key: string) {
  cache.delete(key);
  void removeCache(key);
}
