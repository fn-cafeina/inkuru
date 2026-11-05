import { mock } from 'bun:test';

import { createFakeFileSystem } from './__fixtures__/fileSystem';
import { hashKey } from './ownership';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const fake = createFakeFileSystem();
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

let fetchCalls = 0;

mock.module('expo-file-system', () => fake.module);
mock.module('@react-native-async-storage/async-storage', () => ({
  default: asyncStorage,
}));
mock.module('../source/zonatmo', () => ({
  fetchReader: async () => {
    fetchCalls += 1;
    throw new Error('unexpected network call');
  },
}));

const manager = await import('./manager');

const ROOT = '/documents/downloads';
const INDEX_KEY = 'downloads:index';
const CHAPTER = '/view_uploads/1';
const MISSING = '/view_uploads/2';

const record = (chapterPath: string) => ({
  chapterPath,
  chapterTitle: 'Capítulo 1',
  mangaPath: '/library/manga/7/one',
  mangaTitle: 'Manga',
  pageCount: 2,
  completedAt: 1,
});

const directory = `${ROOT}/${hashKey(CHAPTER)}`;

function seedDownload() {
  const pages = [`${directory}/001.webp`, `${directory}/002.webp`];

  fake.write(pages[0] ?? '', 'p1');
  fake.write(pages[1] ?? '', 'p2');
  fake.write(
    `${directory}/reader.json`,
    JSON.stringify({
      version: 1,
      record: record(CHAPTER),
      data: {
        title: 'Capítulo 1',
        mangaTitle: 'Manga',
        pages,
        chapters: [{ title: 'Capítulo 1', path: CHAPTER }],
        chapterIndex: 0,
      },
    }),
  );

  fake.write(`${ROOT}/sin-marcador/001.webp`, 'huerfano');
}

function indexed(): string[] {
  const raw = storage.get(INDEX_KEY);

  return raw ? (JSON.parse(raw) as { chapterPath: string }[]).map((item) => item.chapterPath) : [];
}

seedDownload();
// A stale entry whose files are gone, plus the real download.
storage.set(INDEX_KEY, JSON.stringify([record(CHAPTER), record(MISSING)]));

await manager.initializeDownloads();

assert(
  manager.getDownloadState(CHAPTER)?.status === 'done',
  'the valid index loads',
);
assert(
  manager.getDownloadState(MISSING) === undefined,
  'an entry without files is discarded',
);
assert(indexed().join() === CHAPTER, 'the index keeps only the real download');
assert(!fake.exists(`${ROOT}/sin-marcador`), 'the orphan folder is swept');

// An already-downloaded chapter never reaches the network.
await manager.enqueueDownload({
  chapterPath: CHAPTER,
  chapterTitle: 'Capítulo 1',
  mangaPath: '/library/manga/7/one',
  mangaTitle: 'Manga',
});

assert(fetchCalls === 0, 'what is already downloaded is not fetched again');
assert(manager.getDownloadState(CHAPTER)?.status === 'done', 'still downloaded');

// A delete that cannot remove the files must keep memory, files and index in sync.
fake.failDeletes.add(`${directory}/reader.json`);
fake.failDeletes.add(directory);

await manager.deleteDownload(CHAPTER);

assert(
  manager.getDownloadState(CHAPTER)?.status === 'done',
  'a failed delete does not mark the chapter as not downloaded',
);
assert(indexed().join() === CHAPTER, 'the index keeps the chapter still on disk');
assert(fake.exists(`${directory}/reader.json`), 'the marker survives the failed delete');

fake.failDeletes.clear();

await manager.deleteDownload(CHAPTER);

assert(manager.getDownloadState(CHAPTER) === undefined, 'a full delete clears the state');
assert(indexed().length === 0, 'a full delete clears the index');
assert(!fake.exists(directory), 'a full delete removes the files');

console.log('download manager ok');
