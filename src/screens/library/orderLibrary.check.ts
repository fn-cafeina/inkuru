import { matchesQuery, orderLibrary } from './orderLibrary';
import type { LibraryEntry } from '../../storage/library';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const entry = (path: string, addedAt: number): LibraryEntry => ({
  path,
  title: path,
  cover: '',
  addedAt,
});

const entries = [
  entry('unread-new', 300),
  entry('read-old', 100),
  entry('unread-old', 200),
  entry('read-new', 400),
];

const ordered = orderLibrary(entries, {
  'read-old': { chapterPath: 'c', chapterTitle: 'c', page: 3 },
  'read-new': { chapterPath: 'c', chapterTitle: 'c', page: 1 },
});

assert(
  ordered.map((item) => item.path).join(',') ===
    'read-new,read-old,unread-new,unread-old',
  `titles with progress come first, newest first: ${ordered.map((item) => item.path).join(',')}`,
);
assert(ordered.length === entries.length, 'no entry is dropped or duplicated');
assert(
  orderLibrary([], {}).length === 0,
  'an empty library stays empty',
);

assert(matchesQuery('Shingeki no Kyojin', 'kyojin'), 'substring match');
assert(matchesQuery('Shingeki no Kyojin', '  KYOJIN '), 'case and spaces ignored');
assert(matchesQuery('Boku no Hero', 'boku'), 'prefix match');
assert(!matchesQuery('Boku no Hero', 'naruto'), 'non match');
assert(matchesQuery('Café', 'cafe'), 'accents are ignored');
assert(matchesQuery('Boku no Hero', ''), 'empty query matches everything');

console.log('library order ok');
