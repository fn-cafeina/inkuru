import AsyncStorage from '@react-native-async-storage/async-storage';

import { isMangaDetail } from '../source/guards';
import type { MangaDetail } from '../source/zonatmo';

// The query cache expires and evicts, and a downloaded chapter is unreachable
// once the chapter list is gone: the reader entry point is the manga screen.
// Library mangas and mangas with downloads keep their detail here instead,
// outside the cache, for as long as they are worth reading offline.
const PREFIX = 'manga:snapshot:';
const snapshotKey = (mangaPath: string) => `${PREFIX}${mangaPath}`;

export async function saveMangaSnapshot(
  mangaPath: string,
  manga: MangaDetail,
): Promise<void> {
  try {
    await AsyncStorage.setItem(snapshotKey(mangaPath), JSON.stringify(manga));
  } catch {
    // An offline copy is a convenience; a storage failure must not block.
  }
}

export async function loadMangaSnapshot(
  mangaPath: string,
): Promise<MangaDetail | null> {
  try {
    const raw = await AsyncStorage.getItem(snapshotKey(mangaPath));

    if (!raw) {
      return null;
    }

    const value: unknown = JSON.parse(raw);

    return isMangaDetail(value) ? value : null;
  } catch {
    return null;
  }
}

export function forgetMangaSnapshot(mangaPath: string): Promise<void> {
  return AsyncStorage.removeItem(snapshotKey(mangaPath)).catch(
    () => undefined,
  );
}
