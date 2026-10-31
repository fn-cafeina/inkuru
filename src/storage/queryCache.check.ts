import { findOrphans } from './queryCache';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

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

console.log('query cache sweep ok');
