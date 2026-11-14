import { mock } from 'bun:test';

import { createFakeFileSystem } from './__fixtures__/fileSystem';
import { hashKey } from './ownership';

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

/** The queue is fire-and-forget; poll until the state the test expects lands. */
async function waitFor(
  predicate: () => boolean,
  label: string,
): Promise<void> {
  const started = Date.now();

  while (!predicate()) {
    if (Date.now() - started > 5000) {
      throw new Error(`timeout: ${label}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 5));
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
let fetchImpl: (path: string, signal?: AbortSignal) => Promise<unknown> =
  async () => {
    throw new Error('unexpected network call');
  };

mock.module('expo-file-system', () => fake.module);
mock.module('@react-native-async-storage/async-storage', () => ({
  default: asyncStorage,
}));
mock.module('../source/zonatmo', () => ({
  fetchReader: (path: string, signal?: AbortSignal) => {
    fetchCalls += 1;

    return fetchImpl(path, signal);
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

// Happy path: fetch the chapter, download every page, write the marker and
// index the download.
const CHAPTER2 = '/view_uploads/9';
const dir2 = `${ROOT}/${hashKey(CHAPTER2)}`;
const pageUrls = [
  'https://cdn.zonatmo.org/9/1.webp',
  'https://cdn.zonatmo.org/9/2.webp',
];

fetchImpl = async (path) => {
  assert(path === CHAPTER2, 'fetchReader asks for the queued chapter');

  return {
    title: 'Capítulo 9',
    mangaTitle: 'Manga',
    pages: pageUrls,
    chapters: [{ title: 'Capítulo 9', path: CHAPTER2 }],
    chapterIndex: 0,
  };
};

await manager.enqueueDownload({
  chapterPath: CHAPTER2,
  chapterTitle: 'Capítulo 9',
  mangaPath: '/library/manga/7/one',
  mangaTitle: 'Manga',
});

await waitFor(
  () => manager.getDownloadState(CHAPTER2)?.status === 'done',
  'the download finishes',
);

assertEqual(fetchCalls, 1, 'the chapter is fetched exactly once');
assertEqual(
  fake.read(`${dir2}/001.webp`),
  `page:${pageUrls[0]}`,
  'page one lands in the hashed directory',
);
assertEqual(
  fake.read(`${dir2}/002.webp`),
  `page:${pageUrls[1]}`,
  'page two lands in the hashed directory',
);
assert(indexed().includes(CHAPTER2), 'the finished download is indexed');

const local = await manager.loadDownloadedReader(CHAPTER2);

assert(local !== null, 'the stored chapter reads back');
assertEqual(
  local?.pages[0] ?? '',
  `${dir2}/001.webp`,
  'the stored pages point at the local files',
);

// A page that fails three times still completes the chapter: the first two
// failures burn downloadPage's internal retry, the third needs a fresh
// attempt from the run. A stall is the page's problem, not the run's.
const CHAPTER3 = '/view_uploads/10';
const dir3 = `${ROOT}/${hashKey(CHAPTER3)}`;
const flaky = 'https://cdn.zonatmo.org/10/1.webp';

fetchImpl = async (path) => {
  assert(path === CHAPTER3, 'fetchReader asks for the queued chapter');

  return {
    title: 'Capítulo 10',
    mangaTitle: 'Manga',
    pages: [flaky, 'https://cdn.zonatmo.org/10/2.webp'],
    chapters: [{ title: 'Capítulo 10', path: CHAPTER3 }],
    chapterIndex: 0,
  };
};

fake.failTimes.set(flaky, 3);

await manager.enqueueDownload({
  chapterPath: CHAPTER3,
  chapterTitle: 'Capítulo 10',
  mangaPath: '/library/manga/7/one',
  mangaTitle: 'Manga',
});

await waitFor(
  () => manager.getDownloadState(CHAPTER3)?.status === 'done',
  'the flaky chapter finishes',
);

assertEqual(
  fake.read(`${dir3}/001.webp`),
  `page:${flaky}`,
  'the flaky page lands after its retries',
);
assertEqual(
  fake.failTimes.get(flaky),
  0,
  'all forced failures were consumed by retries',
);

console.log('download manager ok');
