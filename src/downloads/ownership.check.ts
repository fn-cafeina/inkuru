import { hashKey, isChapterDirName } from './ownership';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const path = '/library/manga/8232/one-punch-man';
const base = hashKey(path);

assert(/^[0-9a-f]{8}$/.test(base), 'hashKey produces 8 hex digits');
assert(hashKey(path) === base, 'hashKey is stable');
assert(hashKey(`${path}-x`) !== base, 'different paths give different hashes');

assert(isChapterDirName(path, base), 'the base name belongs to the chapter');
assert(isChapterDirName(path, `${base}-2`), 'a collision suffix belongs');
assert(isChapterDirName(path, `${base}-100`), 'a high suffix belongs');
assert(
  !isChapterDirName(path, `${base}-x`),
  'a non-numeric suffix does not belong',
);
assert(
  !isChapterDirName(path, `${base}-2-3`),
  'a double suffix does not belong',
);
assert(
  !isChapterDirName('/chapter/other', base),
  'another chapter does not claim the name',
);

console.log('download directory names ok');
