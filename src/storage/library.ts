import AsyncStorage from '@react-native-async-storage/async-storage';

export type LibraryEntry = {
  path: string;
  title: string;
  cover: string;
  addedAt: number;
};

const LIBRARY_KEY = 'library:entries';

export async function loadLibrary(): Promise<LibraryEntry[]> {
  const result = await loadLibraryResult();

  return result.entries;
}

export async function loadLibraryResult(): Promise<{
  entries: LibraryEntry[];
  failed: boolean;
}> {
  try {
    return { entries: await readLibrary(), failed: false };
  } catch {
    return { entries: [], failed: true };
  }
}

export async function isInLibrary(path: string): Promise<boolean> {
  const entries = await loadLibrary();

  return entries.some((entry) => entry.path === path);
}

export async function addToLibrary(entry: LibraryEntry): Promise<boolean> {
  try {
    const entries = await readLibrary();

    if (entries.some((current) => current.path === entry.path)) {
      return true;
    }

    await AsyncStorage.setItem(
      LIBRARY_KEY,
      JSON.stringify([...entries, entry]),
    );

    return true;
  } catch {
    return false;
  }
}

export async function removeFromLibrary(path: string): Promise<boolean> {
  try {
    const entries = await readLibrary();
    const next = entries.filter((entry) => entry.path !== path);

    if (next.length === entries.length) {
      return true;
    }

    await AsyncStorage.setItem(LIBRARY_KEY, JSON.stringify(next));

    return true;
  } catch {
    return false;
  }
}

async function readLibrary(): Promise<LibraryEntry[]> {
  const raw = await AsyncStorage.getItem(LIBRARY_KEY);

  if (!raw) {
    return [];
  }

  const value: unknown = JSON.parse(raw);

  return Array.isArray(value) ? value.filter(isLibraryEntry) : [];
}

function isLibraryEntry(value: unknown): value is LibraryEntry {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.path === 'string' &&
    typeof record.title === 'string' &&
    typeof record.cover === 'string' &&
    typeof record.addedAt === 'number' &&
    Number.isFinite(record.addedAt)
  );
}
