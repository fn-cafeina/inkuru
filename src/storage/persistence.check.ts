import { mock } from 'bun:test';

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

mock.module('@react-native-async-storage/async-storage', () => ({
  default: asyncStorage,
}));

const progress = await import('./readerProgress');
const library = await import('./library');
const settings = await import('./readerSettings');

// --- reading progress ---

assertEqual(await progress.loadProgress('/library/manga/1'), null, 'no progress reads as null');

storage.set(
  'reader:progress:/library/manga/1',
  JSON.stringify({ chapterPath: '/v/1', chapterTitle: 'Capítulo 1', page: 4 }),
);

const saved = await progress.loadProgress('/library/manga/1');

assertEqual(saved?.page, 4, 'the saved page reads back');
assertEqual(saved?.chapterPath, '/v/1', 'the saved chapter reads back');

storage.set(
  'reader:progress:/negativo',
  JSON.stringify({ chapterPath: '/v/1', chapterTitle: 'x', page: -2.7 }),
);
assertEqual((await progress.loadProgress('/negativo'))?.page, 0, 'a negative page clamps to 0');

storage.set('reader:progress:/tipos', JSON.stringify({ chapterPath: 5 }));
assertEqual(await progress.loadProgress('/tipos'), null, 'a wrong-typed record is discarded');

storage.set('reader:progress:/junk', 'no es json');
assertEqual(await progress.loadProgress('/junk'), null, 'an unreadable json is discarded');

const many = await progress.loadProgressMany([
  '/library/manga/1',
  '/library/manga/vacio',
]);

assertEqual(Object.keys(many).length, 1, 'only keys with a record come back');
assertEqual(many['/library/manga/1']?.page, 4, 'the key comes back without its prefix');

// --- read marks ---

storage.set('reader:read:/junk', '{roto');
assertEqual((await progress.loadReadChapters('/junk')).length, 0, 'an unreadable list reads empty');

storage.set('reader:read:/mixo', JSON.stringify(['a', 3, 'b']));
assertEqual((await progress.loadReadChapters('/mixo')).join(','), 'a,b', 'non-strings are filtered out');

await progress.markChapterRead('/m', '/v/1');
await progress.markChapterRead('/m', '/v/1');
assertEqual((await progress.loadReadChapters('/m')).length, 1, 'marking twice does not duplicate');

storage.set(progress.pageProgressKey('/v/1'), '7');
await progress.forgetPageProgress('/v/1');
assert(!storage.has(progress.pageProgressKey('/v/1')), 'the page mark is forgotten');

// --- library ---

storage.set('library:entries', '{roto');
assert((await library.loadLibraryResult()).failed, 'an unreadable index marks failed');

storage.set(
  'library:entries',
  JSON.stringify([
    { path: '/a', title: 'A', cover: 'c', addedAt: 1 },
    { path: '/b', title: 2 },
  ]),
);

const entries = await library.loadLibraryResult();

assertEqual(entries.failed, false, 'a valid json does not fail');
assertEqual(entries.entries.length, 1, 'the bad entries are filtered out');
assert(await library.isInLibrary('/a'), 'the valid entry is found');
assert(!(await library.isInLibrary('/b')), 'the filtered entry does not appear');

await library.addToLibrary({ path: '/c', title: 'C', cover: 'c', addedAt: 2 });
await library.addToLibrary({ path: '/c', title: 'C', cover: 'c', addedAt: 2 });
assertEqual(
  (await library.loadLibraryResult()).entries.length,
  2,
  'adding twice does not duplicate',
);

assert(await library.removeFromLibrary('/c'), 'removing an entry returns true');
assert(await library.removeFromLibrary('/ausente'), 'removing something absent returns true');
assertEqual(
  (await library.loadLibraryResult()).entries.length,
  1,
  'removing deletes the entry',
);

// --- reader settings, including the pre-split stored values ---

assertEqual(await settings.loadReaderMode(), null, 'no saved mode reads as null');
assertEqual(
  settings.DEFAULT_READER_MODE,
  'paged-rtl',
  'the default reader mode is right to left',
);

storage.set('reader:mode', 'vertical');
assertEqual(await settings.loadReaderMode(), 'webtoon', 'vertical migrates to webtoon');
storage.set('reader:mode', 'paged');
assertEqual(await settings.loadReaderMode(), 'paged-rtl', 'paged migrates to paged-rtl');
storage.set('reader:mode', 'paged-ltr');
assertEqual(await settings.loadReaderMode(), 'paged-ltr', 'paged-ltr is kept');
storage.set('reader:mode', 'zarro');
assertEqual(await settings.loadReaderMode(), null, 'an unknown mode is discarded');

storage.set('reader:scale', 'fill');
assertEqual(await settings.loadReaderScale(), 'fit-screen', 'fill migrates to fit-screen');
storage.set('reader:scale', 'fit-width');
assertEqual(await settings.loadReaderScale(), 'fit-width', 'fit-width is kept');
storage.set('reader:scale', 'zarro');
assertEqual(await settings.loadReaderScale(), null, 'an unknown scale is discarded');

storage.set('reader:quality', 'maximum');
assertEqual(await settings.loadReaderQuality(), 'original', 'maximum migrates to original');
storage.set('reader:quality', 'balanced');
assertEqual(await settings.loadReaderQuality(), 'balanced', 'balanced is kept');
storage.set('reader:quality', 'zarro');
assertEqual(await settings.loadReaderQuality(), null, 'an unknown quality is discarded');

assertEqual(await settings.loadKeepAwake(), true, 'no value defaults to keep screen on');
storage.set('reader:keepAwake', 'false');
assertEqual(await settings.loadKeepAwake(), false, 'false reads as off');
storage.set('reader:keepAwake', 'zarro');
assertEqual(
  await settings.loadKeepAwake(),
  true,
  'an unknown value falls back to the default',
);

await settings.saveReaderMode('paged-ltr');
assertEqual(await settings.loadReaderMode(), 'paged-ltr', 'the mode roundtrips');
await settings.saveReaderScale('fit-width');
assertEqual(await settings.loadReaderScale(), 'fit-width', 'the scale roundtrips');
await settings.saveKeepAwake(true);
assertEqual(await settings.loadKeepAwake(), true, 'keep screen on roundtrips');

// --- per-manga reader overrides ---

assertEqual(
  await settings.loadMangaReaderOverrides('/library/manga/1'),
  null,
  'no overrides read as null',
);

await settings.saveMangaReaderOverride('/library/manga/1', 'mode', 'paged-ltr');
await settings.saveMangaReaderOverride('/library/manga/1', 'quality', 'original');

const overrides = await settings.loadMangaReaderOverrides('/library/manga/1');

assertEqual(overrides?.mode, 'paged-ltr', 'the saved mode override reads back');
assertEqual(overrides?.quality, 'original', 'the quality override reads back');
assertEqual(overrides?.scale, undefined, 'untouched fields stay unset');

assertEqual(
  await settings.loadMangaReaderOverrides('/library/manga/2'),
  null,
  'overrides are per manga',
);

storage.set('reader:manga-overrides', 'not json');
assertEqual(
  await settings.loadMangaReaderOverrides('/library/manga/1'),
  null,
  'a corrupt map reads as empty',
);

storage.set(
  'reader:manga-overrides',
  JSON.stringify({ '/library/manga/1': { mode: 'zarro', scale: 'webtoon' } }),
);
const corrupted = await settings.loadMangaReaderOverrides('/library/manga/1');
assertEqual(corrupted?.mode, undefined, 'an unknown override mode is discarded');
assertEqual(corrupted?.scale, undefined, 'an unknown override scale is discarded');

// --- download settings ---

const downloads = await import('./downloadSettings');

assertEqual(downloads.clampDownloadConcurrency(3), 3, 'a valid value is kept');
assertEqual(downloads.clampDownloadConcurrency(0), 1, 'below the floor clamps up');
assertEqual(downloads.clampDownloadConcurrency(99), 10, 'above the ceiling clamps down');
assertEqual(downloads.clampDownloadConcurrency(2.5), 1, 'a non-integer falls back to the default');

assertEqual(await downloads.loadDownloadConcurrency(), 1, 'no value reads the default');
await downloads.saveDownloadConcurrency(4);
assertEqual(await downloads.loadDownloadConcurrency(), 4, 'the concurrency roundtrips');
await downloads.saveDownloadConcurrency(99);
assertEqual(await downloads.loadDownloadConcurrency(), 10, 'saves are clamped too');
storage.set('downloads:concurrency', 'abc');
assertEqual(await downloads.loadDownloadConcurrency(), 1, 'a corrupt value reads the default');

console.log('persistence ok');
