import { orderLibrary, sameEntries, sameProgress } from './orderLibrary';
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

const single = (path: string) => ({
  path,
  title: path,
  cover: path,
  addedAt: 1,
});

assert(sameEntries([single('/a')], [single('/a')]), 'equal entries compare equal');
assert(!sameEntries([single('/a')], [single('/b')]), 'a different path differs');
assert(!sameEntries([single('/a')], []), 'a shorter list differs');
assert(
  sameProgress(
    { '/a': { chapterPath: '/c', chapterTitle: 'C', page: 3 } },
    { '/a': { chapterPath: '/c', chapterTitle: 'C', page: 3 } },
  ),
  'equal progress compares equal',
);
assert(
  !sameProgress(
    { '/a': { chapterPath: '/c', chapterTitle: 'C', page: 3 } },
    { '/a': { chapterPath: '/c', chapterTitle: 'C', page: 4 } },
  ),
  'a different page differs',
);

console.log('library order ok');
