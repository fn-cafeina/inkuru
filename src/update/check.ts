import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import NetInfo from '@react-native-community/netinfo';

import {
  isNewerVersion,
  parseRelease,
  shouldCheck,
} from './release';
import type { LatestRelease } from './release';

const REPO = 'fn-cafeina/inkuru';
const RELEASES_URL = `https://api.github.com/repos/${REPO}/releases/latest`;
const STATE_KEY = 'update:state';
const STATE_VERSION = 2;
// GitHub answers fast; a dead network must not spin the row forever.
const CHECK_TIMEOUT_MS = 10_000;
const OFFLINE_MESSAGE = 'Sin conexión';
const NETWORK_MESSAGE = 'No se pudo conectar con GitHub. Reintentá más tarde.';

type StoredState = {
  v: number;
  /** Last round trip against the API, throttle anchor. */
  checkedAt: number;
  etag: string | null;
  tag: string | null;
  apkUrl: string | null;
  /** Whether the app checks for releases on its own. */
  autoCheck: boolean;
};

export type UpdateState = {
  checking: boolean;
  /** The last check failed; the shown state may be stale. */
  failure: string | null;
  /** Release newer than the installed version, when one is known. */
  available: LatestRelease | null;
  /** When the API last answered, null when the app has never checked. */
  checkedAt: number | null;
  autoCheck: boolean;
};

const EMPTY_STORED: StoredState = {
  v: STATE_VERSION,
  checkedAt: 0,
  etag: null,
  tag: null,
  apkUrl: null,
  autoCheck: true,
};

let stored: StoredState | null = null;
let inFlight: Promise<UpdateState> | null = null;
let state: UpdateState = {
  checking: false,
  failure: null,
  available: null,
  checkedAt: null,
  autoCheck: true,
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

/** Toggle the on-launch check; persists with the rest of the state. */
export async function setAutoCheck(enabled: boolean): Promise<void> {
  const previous = await loadStored();

  commit({ ...previous, autoCheck: enabled });
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

  if (!force && !previous.autoCheck) {
    return state;
  }

  if (!force && !shouldCheck(previous.checkedAt, now)) {
    // Hydrate the in-memory state from storage after a cold start.
    publish({ ...state, checking: false }, previous);

    return state;
  }

  if (inFlight !== null) {
    return inFlight;
  }

  publish({ ...state, checking: true, failure: null }, previous);

  const request = doCheck(previous, now, force).finally(() => {
    inFlight = null;
  });

  inFlight = request;

  return request;
}

async function doCheck(
  previous: StoredState,
  now: number,
  force: boolean,
): Promise<UpdateState> {
  try {
    const offline = await isOffline();

    if (offline) {
      if (!force) {
        // A background check without a connection is noise, not a failure.
        publish({ ...state, checking: false }, previous);

        return state;
      }

      throw new Error(OFFLINE_MESSAGE);
    }

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      // The API rejects requests without an application identity.
      'User-Agent': 'inkuru',
    };

    if (previous.etag !== null) {
      headers['If-None-Match'] = previous.etag;
    }

    const response = await fetchWithTimeout(RELEASES_URL, headers);

    if (response.status === 304) {
      commit({ ...previous, checkedAt: now });
    } else if (response.status === 404) {
      commit({ ...EMPTY_STORED, checkedAt: now, autoCheck: previous.autoCheck });
    } else if (response.ok) {
      const release = parseRelease(await response.json());

      commit({
        v: STATE_VERSION,
        checkedAt: now,
        etag: response.headers.get('etag'),
        tag: release?.tag ?? null,
        apkUrl: release?.apkUrl ?? null,
        autoCheck: previous.autoCheck,
      });
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    publish(
      {
        ...state,
        checking: false,
        failure:
          error instanceof Error && error.message === OFFLINE_MESSAGE
            ? OFFLINE_MESSAGE
            : NETWORK_MESSAGE,
      },
      previous,
    );
  }

  return state;
}

async function isOffline(): Promise<boolean> {
  try {
    const net = await NetInfo.fetch();

    return net.isConnected === false || net.isInternetReachable === false;
  } catch {
    // NetInfo unavailable: assume online, the fetch decides.
    return false;
  }
}

async function fetchWithTimeout(
  url: string,
  headers: Record<string, string>,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);

  try {
    return await fetch(url, { headers, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function commit(next: StoredState): void {
  stored = next;
  void AsyncStorage.setItem(STATE_KEY, JSON.stringify(next)).catch(() => undefined);
  // publish() replaces checkedAt and autoCheck with the stored values.
  publish(
    {
      checking: false,
      failure: null,
      available: availableFrom(next),
      checkedAt: null,
      autoCheck: next.autoCheck,
    },
    next,
  );
}

function publish(next: UpdateState, nextStored: StoredState): void {
  const known = availableFrom(nextStored);
  state = {
    ...next,
    available: known,
    checkedAt: nextStored.checkedAt > 0 ? nextStored.checkedAt : null,
    autoCheck: nextStored.autoCheck,
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

  // v1 predates the auto-check toggle; those users keep checking on launch.
  if (
    (record.v !== 1 && record.v !== STATE_VERSION) ||
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
    autoCheck: record.autoCheck !== false,
  };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isStringOrNull(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}
