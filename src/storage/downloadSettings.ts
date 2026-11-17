import AsyncStorage from '@react-native-async-storage/async-storage';

export const MIN_DOWNLOAD_CONCURRENCY = 1;
export const MAX_DOWNLOAD_CONCURRENCY = 10;
export const DEFAULT_DOWNLOAD_CONCURRENCY = 1;

const CONCURRENCY_KEY = 'downloads:concurrency';

export function clampDownloadConcurrency(value: number): number {
  if (!Number.isInteger(value)) {
    return DEFAULT_DOWNLOAD_CONCURRENCY;
  }

  return Math.min(
    MAX_DOWNLOAD_CONCURRENCY,
    Math.max(MIN_DOWNLOAD_CONCURRENCY, value),
  );
}

export async function loadDownloadConcurrency(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(CONCURRENCY_KEY);

    if (raw === null) {
      return DEFAULT_DOWNLOAD_CONCURRENCY;
    }

    return clampDownloadConcurrency(Number(raw));
  } catch {
    return DEFAULT_DOWNLOAD_CONCURRENCY;
  }
}

export async function saveDownloadConcurrency(value: number): Promise<void> {
  try {
    await AsyncStorage.setItem(
      CONCURRENCY_KEY,
      String(clampDownloadConcurrency(value)),
    );
  } catch {
    // A storage failure must not block downloading.
  }
}
