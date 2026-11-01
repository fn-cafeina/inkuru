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

const {
  deleteChapterFiles,
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

assert(hasDownloadFiles(chapterA), 'un marcador válido cuenta como descargado');
assert(!hasDownloadFiles(chapterB), 'otro capítulo no hereda los ficheros');

const wrapper = await readDownloadFile(chapterA);

assert(wrapper?.record.chapterPath === chapterA, 'se lee el contenedor del capítulo');
assert(wrapper?.data.pages[0] === `${dirA}/001.webp`, 'las páginas son locales');

// Another chapter's marker in the base slot: the new download must not reuse it.
fake.write(
  `${dirOf(chapterB)}/reader.json`,
  JSON.stringify({ version: 1, record: record(chapterA), data: readerData([`${dirA}/001.webp`]) }),
);

const collisionSlot = prepareChapterDirectory(chapterB);

assert(collisionSlot.uri === dirOf(chapterB, 2), 'slot ocupado pasa al siguiente sufijo');
assert(hasDownloadFiles(chapterA), 'la carpeta del otro capítulo sigue intacta');

// Unreadable marker: never reused, never silently deleted.
fake.write(`${dirOf(chapterC)}/reader.json`, '{roto');

assert((await readDownloadFile(chapterC)) === null, 'marcador ilegible no se lee');
assert(!hasDownloadFiles(chapterC), 'marcador ilegible no cuenta como descargado');
assert(
  deleteChapterFiles(chapterC) === false,
  'marcador ilegible bloquea el borrado ciego',
);
assert(fake.exists(`${dirOf(chapterC)}/reader.json`), 'el marcador ilegible se conserva');

// A valid download missing from the index is recovered; leftovers are swept.
const recovered = seed(chapterD);

fake.write(`${ROOT}/sin-marcador/001.webp`, 'huerfano');

const recoveredRecords = await reconcileDirectories(new Set([hashKey(chapterA)]));

assert(
  recoveredRecords.some((item) => item.chapterPath === chapterD),
  'una descarga completa sin índice se recupera',
);
assert(fake.exists(recovered), 'la carpeta recuperada se conserva');
assert(!fake.exists(`${ROOT}/sin-marcador`), 'una carpeta sin marcador se barre');
assert(hasDownloadFiles(chapterA), 'la descarga conocida sobrevive a la reconciliación');

// Deleting only touches directories this chapter owns.
assert(deleteChapterFiles(chapterA), 'se borran los ficheros del capítulo');
assert(!hasDownloadFiles(chapterA), 'el capítulo borrado ya no cuenta');
assert(!fake.exists(dirA), 'la carpeta del capítulo desaparece');

// The marker is written last, through a temp file, so a half write never parses.
const directory = prepareChapterDirectory(chapterA);

await writeDownloadFile(directory, {
  version: 1,
  record: record(chapterA),
  data: readerData([`${directory.uri}/001.webp`]),
});

assert(
  fake.read(`${directory.uri}/reader.json`)?.startsWith('{"version":1') === true,
  'el marcador se escribe completo',
);
assert(!fake.exists(`${directory.uri}/reader.json.tmp`), 'no queda el temporal');

console.log('download files ok');
