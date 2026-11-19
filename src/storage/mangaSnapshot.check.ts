import { mock } from 'bun:test';

import type { MangaDetail } from '@/source/zonatmo';

function assertEqual<T>(actual: T, expected: T, label: string): void {
  if (actual !== expected) {
    throw new Error(
      `${label}: expected ${String(expected)}, received ${String(actual)}`,
    );
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
};

mock.module('@react-native-async-storage/async-storage', () => ({
  default: asyncStorage,
}));

const { forgetMangaSnapshot, loadMangaSnapshot, saveMangaSnapshot } =
  await import('./mangaSnapshot');

const MANGA_PATH = '/library/manga/8232/one-punch-man';

function manga(chapters: number): MangaDetail {
  return {
    title: 'ONE PUNCH-MAN',
    cover: 'https://zonatmo.org/cover.jpg',
    tags: ['Acción'],
    status: 'Publicándose',
    synopsis: 'Un héroe promedio.',
    chapters: Array.from({ length: chapters }, (_, index) => ({
      title: `Capítulo ${index + 1}`,
      path: `/view_uploads/${index + 1}`,
    })),
    related: [],
  };
}

assertEqual(
  await loadMangaSnapshot(MANGA_PATH),
  null,
  'nothing saved yet reads as nothing',
);

await saveMangaSnapshot(MANGA_PATH, manga(3));

const saved = await loadMangaSnapshot(MANGA_PATH);
assertEqual(saved?.chapters.length, 3, 'the chapter list survives a reload');
assertEqual(saved?.title, 'ONE PUNCH-MAN', 'the detail survives a reload');
assertEqual(
  await loadMangaSnapshot('/library/manga/1/other'),
  null,
  'another manga reads its own entry',
);

// Saving again replaces the list instead of stacking copies.
await saveMangaSnapshot(MANGA_PATH, manga(4));
assertEqual(
  (await loadMangaSnapshot(MANGA_PATH))?.chapters.length,
  4,
  'a newer detail replaces the saved one',
);

// A payload that no longer matches the guard is not served.
storage.set(`manga:snapshot:${MANGA_PATH}`, JSON.stringify({ title: 'x' }));
assertEqual(
  await loadMangaSnapshot(MANGA_PATH),
  null,
  'a broken snapshot is ignored',
);

storage.set(`manga:snapshot:${MANGA_PATH}`, 'not json');
assertEqual(
  await loadMangaSnapshot(MANGA_PATH),
  null,
  'unparseable storage is ignored',
);

await saveMangaSnapshot(MANGA_PATH, manga(1));
await forgetMangaSnapshot(MANGA_PATH);
assertEqual(
  await loadMangaSnapshot(MANGA_PATH),
  null,
  'forgetting removes the snapshot',
);

console.log('manga snapshot ok');
