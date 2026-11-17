import { mock } from 'bun:test';

import { createFakeFileSystem } from './__fixtures__/fileSystem';
import { hashKey } from './ownership';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const fake = createFakeFileSystem();

mock.module('expo-file-system', () => fake.module);

const { forgetLocalReader, loadDownloadedReader } = await import('./localReader');

const CHAPTER = '/view_uploads/1';
const MARKER = `/documents/downloads/${hashKey(CHAPTER)}/reader.json`;
const data = {
  title: 'Capítulo 1',
  pages: ['/documents/downloads/x/001.webp'],
  chapters: [{ title: 'Capítulo 1', path: CHAPTER }],
  chapterIndex: 0,
};

fake.write(
  MARKER,
  JSON.stringify({
    version: 1,
    record: {
      chapterPath: CHAPTER,
      chapterTitle: 'Capítulo 1',
      mangaPath: '/library/manga/7/one',
      mangaTitle: 'Manga',
      pageCount: 1,
      completedAt: 1,
    },
    data,
  }),
);

const first = await loadDownloadedReader(CHAPTER);

assert(first?.title === 'Capítulo 1', 'the local file is read');

// Once the marker is gone the memoized copy must still answer: that is the
// whole point of the cache.
fake.write(MARKER, '');
const cached = await loadDownloadedReader(CHAPTER);

assert(cached?.title === 'Capítulo 1', 'a second open uses the memoized payload');

forgetLocalReader(CHAPTER);

const forgotten = await loadDownloadedReader(CHAPTER);

assert(forgotten === null, 'forgetting the chapter drops the memoized payload');

console.log('local reader ok');
