import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

import {
  isNewerVersion,
  parseRelease,
  shouldCheck,
} from './release';
import type { LatestRelease } from './release';

const REPO = 'fn-cafeina/inkuru';
const RELEASES_URL = `https://api.github.com/repos/${REPO}/releases/latest`;
const STATE_KEY = 'update:state';
const STATE_VERSION = 1;

type StoredState = {
  v: number;
  /** Last round trip against the API, throttle anchor. */
  checkedAt: number;
  etag: string | null;
  tag: string | null;
  apkUrl: string | null;
};

export type UpdateState = {
  checking: boolean;
  /** The last check failed; the shown state may be stale. */
  failed: boolean;
  /** Release newer than the installed version, when one is known. */
  available: LatestRelease | null;
  /** When the API last answered, null when the app has never checked. */
  checkedAt: number | null;
};

const EMPTY_STORED: StoredState = {
  v: STATE_VERSION,
  checkedAt: 0,
  etag: null,
  tag: null,
  apkUrl: null,
};

let stored: StoredState | null = null;
let inFlight: Promise<UpdateState> | null = null;
let state: UpdateState = {
  checking: false,
  failed: false,
  available: null,
  checkedAt: null,
};
const listeners = new Set<() => void>();

export function subscribeUpdates(listener: () => void): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function getUpdateState(): UpdateState {
  return state;
}

export function currentVersion(): string {
  return Constants.expoConfig?.version ?? '0.0.0';
}

/**
 * Refresh the latest release, at most once per throttle window unless forced.
 * A 304 keeps the stored release and refreshes the anchor without spending
 * rate limit; a 404 means the repository has no releases yet.
 * Concurrent calls share one request, so the mount check and a tap cannot
 * race.
 */
export async function checkForUpdate(force = false): Promise<UpdateState> {
  const previous = await loadStored();
  const now = Date.now();

  if (!force && !shouldCheck(previous.checkedAt, now)) {
    publish({ ...state, checking: false, failed: false }, previous);

    return state;
  }

  if (inFlight !== null) {
    return inFlight;
  }

  publish({ ...state, checking: true, failed: false }, previous);

  const request = doCheck(previous, now).finally(() => {
    inFlight = null;
  });

  inFlight = request;

  return request;
}

async function doCheck(
  previous: StoredState,
  now: number,
): Promise<UpdateState> {
  try {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      // The API rejects requests without an application identity.
      'User-Agent': 'inkuru',
    };

    if (previous.etag !== null) {
      headers['If-None-Match'] = previous.etag;
    }

    const response = await fetch(RELEASES_URL, { headers });

    if (response.status === 304) {
      commit({ ...previous, checkedAt: now });
    } else if (response.status === 404) {
      commit({ ...EMPTY_STORED, checkedAt: now });
    } else if (response.ok) {
      const release = parseRelease(await response.json());

      commit({
        v: STATE_VERSION,
        checkedAt: now,
        etag: response.headers.get('etag'),
        tag: release?.tag ?? null,
        apkUrl: release?.apkUrl ?? null,
      });
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch {
    publish({ ...state, checking: false, failed: true }, previous);
  }

  return state;
}

function commit(next: StoredState): void {
  stored = next;
  void AsyncStorage.setItem(STATE_KEY, JSON.stringify(next)).catch(() => undefined);
  // publish() replaces checkedAt with the stored anchor.
  publish(
    { checking: false, failed: false, available: availableFrom(next), checkedAt: null },
    next,
  );
}

function publish(next: UpdateState, nextStored: StoredState): void {
  const known = availableFrom(nextStored);
  state = {
    ...next,
    available: known,
    checkedAt: nextStored.checkedAt > 0 ? nextStored.checkedAt : null,
  };

  for (const listener of listeners) {
    listener();
  }
}

function availableFrom(value: StoredState): LatestRelease | null {
  if (value.tag === null || value.apkUrl === null) {
    return null;
  }

  return isNewerVersion(value.tag, currentVersion())
    ? { tag: value.tag, apkUrl: value.apkUrl }
    : null;
}

async function loadStored(): Promise<StoredState> {
  if (stored !== null) {
    return stored;
  }

  const raw = await AsyncStorage.getItem(STATE_KEY).catch(() => null);
  stored = raw === null ? { ...EMPTY_STORED } : parseStored(raw);

  return stored;
}

function parseStored(raw: string): StoredState {
  try {
    const valid = validateStored(JSON.parse(raw));

    if (valid !== null) {
      return valid;
    }
  } catch {
    // Unreadable state only costs one extra check.
  }

  return { ...EMPTY_STORED };
}

function validateStored(parsed: unknown): StoredState | null {
  if (typeof parsed !== 'object' || parsed === null) {
    return null;
  }

  const record = parsed as Record<string, unknown>;

  if (
    record.v !== STATE_VERSION ||
    !isFiniteNumber(record.checkedAt) ||
    !isStringOrNull(record.etag) ||
    !isStringOrNull(record.tag) ||
    !isStringOrNull(record.apkUrl)
  ) {
    return null;
  }

  return {
    v: STATE_VERSION,
    checkedAt: record.checkedAt,
    etag: record.etag,
    tag: record.tag,
    apkUrl: record.apkUrl,
  };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isStringOrNull(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}