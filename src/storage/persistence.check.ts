import { mock } from 'bun:test';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual<T>(actual: T, expected: T, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label}: esperado ${String(expected)}, recibido ${String(actual)}`);
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

assertEqual(await progress.loadProgress('/library/manga/1'), null, 'sin progreso da null');

storage.set(
  'reader:progress:/library/manga/1',
  JSON.stringify({ chapterPath: '/v/1', chapterTitle: 'Capítulo 1', page: 4 }),
);

const saved = await progress.loadProgress('/library/manga/1');

assertEqual(saved?.page, 4, 'el progreso guardado se lee');
assertEqual(saved?.chapterPath, '/v/1', 'el capítulo guardado se lee');

storage.set(
  'reader:progress:/negativo',
  JSON.stringify({ chapterPath: '/v/1', chapterTitle: 'x', page: -2.7 }),
);
assertEqual((await progress.loadProgress('/negativo'))?.page, 0, 'una página negativa se corta a 0');

storage.set('reader:progress:/tipos', JSON.stringify({ chapterPath: 5 }));
assertEqual(await progress.loadProgress('/tipos'), null, 'un registro con tipos malos se descarta');

storage.set('reader:progress:/junk', 'no es json');
assertEqual(await progress.loadProgress('/junk'), null, 'un json ilegible se descarta');

const many = await progress.loadProgressMany([
  '/library/manga/1',
  '/library/manga/vacio',
]);

assertEqual(Object.keys(many).length, 1, 'solo las claves con registro vuelven');
assertEqual(many['/library/manga/1']?.page, 4, 'la clave se devuelve sin el prefijo');

// --- read marks ---

storage.set('reader:read:/junk', '{roto');
assertEqual((await progress.loadReadChapters('/junk')).length, 0, 'una lista ilegible da vacía');

storage.set('reader:read:/mixo', JSON.stringify(['a', 3, 'b']));
assertEqual((await progress.loadReadChapters('/mixo')).join(','), 'a,b', 'los no-string se filtran');

await progress.markChapterRead('/m', '/v/1');
await progress.markChapterRead('/m', '/v/1');
assertEqual((await progress.loadReadChapters('/m')).length, 1, 'marcar dos veces no duplica');

storage.set(progress.pageProgressKey('/v/1'), '7');
await progress.forgetPageProgress('/v/1');
assert(!storage.has(progress.pageProgressKey('/v/1')), 'la marca de página se olvida');

// --- library ---

storage.set('library:entries', '{roto');
assert((await library.loadLibraryResult()).failed, 'un índice ilegible marca failed');

storage.set(
  'library:entries',
  JSON.stringify([
    { path: '/a', title: 'A', cover: 'c', addedAt: 1 },
    { path: '/b', title: 2 },
  ]),
);

const entries = await library.loadLibraryResult();

assertEqual(entries.failed, false, 'un json válido no falla');
assertEqual(entries.entries.length, 1, 'las entradas malas se filtran');
assert(await library.isInLibrary('/a'), 'la entrada válida se encuentra');
assert(!(await library.isInLibrary('/b')), 'la entrada filtrada no aparece');

await library.addToLibrary({ path: '/c', title: 'C', cover: 'c', addedAt: 2 });
await library.addToLibrary({ path: '/c', title: 'C', cover: 'c', addedAt: 2 });
assertEqual(
  (await library.loadLibraryResult()).entries.length,
  2,
  'añadir dos veces no duplica',
);

assert(await library.removeFromLibrary('/c'), 'quitar una entrada devuelve true');
assert(await library.removeFromLibrary('/ausente'), 'quitar algo ausente devuelve true');
assertEqual(
  (await library.loadLibraryResult()).entries.length,
  1,
  'quitar borra la entrada',
);

// --- reader settings, including the pre-split stored values ---

assertEqual(await settings.loadReaderMode(), null, 'sin modo guardado da null');

storage.set('reader:mode', 'vertical');
assertEqual(await settings.loadReaderMode(), 'webtoon', 'vertical migra a webtoon');
storage.set('reader:mode', 'paged');
assertEqual(await settings.loadReaderMode(), 'paged-rtl', 'paged migra a paged-rtl');
storage.set('reader:mode', 'paged-ltr');
assertEqual(await settings.loadReaderMode(), 'paged-ltr', 'paged-ltr se conserva');
storage.set('reader:mode', 'zarro');
assertEqual(await settings.loadReaderMode(), null, 'un modo desconocido se descarta');

storage.set('reader:scale', 'fill');
assertEqual(await settings.loadReaderScale(), 'fit-screen', 'fill migra a fit-screen');
storage.set('reader:scale', 'fit-width');
assertEqual(await settings.loadReaderScale(), 'fit-width', 'fit-width se conserva');
storage.set('reader:scale', 'zarro');
assertEqual(await settings.loadReaderScale(), null, 'una escala desconocida se descarta');

storage.set('reader:quality', 'maximum');
assertEqual(await settings.loadReaderQuality(), 'original', 'maximum migra a original');
storage.set('reader:quality', 'balanced');
assertEqual(await settings.loadReaderQuality(), 'balanced', 'balanced se conserva');
storage.set('reader:quality', 'zarro');
assertEqual(await settings.loadReaderQuality(), null, 'una calidad desconocida se descarta');

assertEqual(await settings.loadKeepAwake(), true, 'sin valor, mantener encendida por defecto');
storage.set('reader:keepAwake', 'false');
assertEqual(await settings.loadKeepAwake(), false, 'false se lee como apagado');
storage.set('reader:keepAwake', 'zarro');
assertEqual(await settings.loadKeepAwake(), false, 'solo true enciende');

await settings.saveReaderMode('paged-ltr');
assertEqual(await settings.loadReaderMode(), 'paged-ltr', 'el modo hace roundtrip');
await settings.saveReaderScale('fit-width');
assertEqual(await settings.loadReaderScale(), 'fit-width', 'la escala hace roundtrip');
await settings.saveKeepAwake(true);
assertEqual(await settings.loadKeepAwake(), true, 'mantener encendida hace roundtrip');

console.log('persistence ok');