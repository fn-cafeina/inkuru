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

const { File } = await import('expo-file-system');
const {
  deleteChapterFiles,
  downloadPage,
  hasDownloadFiles,
  prepareChapterDirectory,
  readDownloadFile,
  reconcileDirectories,
  writeDownloadFile,
} = await import('./files');

const ROOT = '/documents/downloads';
const MANGA = '/library/manga/7/one';

const chapterA = '/view_uploads/1';
const chapterB = '/view_uploads/2';
const chapterC = '/view_uploads/3';
const chapterD = '/view_uploads/4';

const dirOf = (chapterPath: string, slot = 1) =>
  `${ROOT}/${hashKey(chapterPath)}${slot === 1 ? '' : `-${slot}`}`;

const record = (chapterPath: string) => ({
  chapterPath,
  chapterTitle: 'Capítulo 1',
  mangaPath: MANGA,
  mangaTitle: 'Manga',
  pageCount: 2,
  completedAt: 1,
});

const readerData = (pages: string[]) => ({
  title: 'Capítulo 1',
  mangaTitle: 'Manga',
  pages,
  chapters: [{ title: 'Capítulo 1', path: chapterA }],
  chapterIndex: 0,
});

function seed(chapterPath: string) {
  const directory = dirOf(chapterPath);
  const pages = [`${directory}/001.webp`, `${directory}/002.webp`];

  fake.write(pages[0] ?? '', 'p1');
  fake.write(pages[1] ?? '', 'p2');
  fake.write(
    `${directory}/reader.json`,
    JSON.stringify({ version: 1, record: record(chapterPath), data: readerData(pages) }),
  );

  return directory;
}

const dirA = seed(chapterA);

assert(hasDownloadFiles(chapterA), 'a valid marker counts as downloaded');
assert(!hasDownloadFiles(chapterB), 'another chapter does not inherit the files');

const wrapper = await readDownloadFile(chapterA);

assert(wrapper?.record.chapterPath === chapterA, 'the chapter wrapper reads back');
assert(wrapper?.data.pages[0] === `${dirA}/001.webp`, 'the pages are local');

// Another chapter's marker in the base slot: the new download must not reuse it.
fake.write(
  `${dirOf(chapterB)}/reader.json`,
  JSON.stringify({ version: 1, record: record(chapterA), data: readerData([`${dirA}/001.webp`]) }),
);

const collisionSlot = prepareChapterDirectory(chapterB);

assert(collisionSlot.uri === dirOf(chapterB, 2), 'an occupied slot moves to the next suffix');
assert(hasDownloadFiles(chapterA), 'the other chapter folder stays intact');

// Unreadable marker: never reused, never silently deleted.
fake.write(`${dirOf(chapterC)}/reader.json`, '{roto');

assert((await readDownloadFile(chapterC)) === null, 'an unreadable marker does not read');
assert(!hasDownloadFiles(chapterC), 'an unreadable marker does not count as downloaded');
assert(
  deleteChapterFiles(chapterC) === false,
  'an unreadable marker blocks a blind delete',
);
assert(fake.exists(`${dirOf(chapterC)}/reader.json`), 'the unreadable marker is kept');

// A valid download missing from the index is recovered; leftovers are swept.
const recovered = seed(chapterD);

fake.write(`${ROOT}/sin-marcador/001.webp`, 'huerfano');

const recoveredRecords = await reconcileDirectories(new Set([hashKey(chapterA)]));

assert(
  recoveredRecords.some((item) => item.chapterPath === chapterD),
  'a full download missing from the index is recovered',
);
assert(fake.exists(recovered), 'the recovered folder is kept');
assert(!fake.exists(`${ROOT}/sin-marcador`), 'a folder without a marker is swept');
assert(hasDownloadFiles(chapterA), 'the known download survives reconciliation');

// Re-using a directory this chapter already owns wipes it, and the wipe must
// leave an existing directory behind: the native download needs the parent.
const owned = prepareChapterDirectory(chapterD);

assert(fake.exists(recovered), 'the owned folder is recreated after the wipe');

const page = new File(owned, '001.webp');

await downloadPage(
  'https://cdn.example/1.webp',
  page,
  new AbortController().signal,
);
assert(
  fake.read(page.uri) === 'page:https://cdn.example/1.webp',
  'the page downloads into the recreated folder',
);

// Deleting only touches directories this chapter owns.
assert(deleteChapterFiles(chapterA), 'the chapter files are deleted');
assert(!hasDownloadFiles(chapterA), 'the deleted chapter no longer counts');
assert(!fake.exists(dirA), 'the chapter folder disappears');

// The marker is written last, through a temp file, so a half write never parses.
const directory = prepareChapterDirectory(chapterA);

await writeDownloadFile(directory, {
  version: 1,
  record: record(chapterA),
  data: readerData([`${directory.uri}/001.webp`]),
});

assert(
  fake.read(`${directory.uri}/reader.json`)?.startsWith('{"version":1') === true,
  'the marker is written whole',
);
assert(!fake.exists(`${directory.uri}/reader.json.tmp`), 'no temp file remains');

console.log('download files ok');
