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

// Corrupt the persisted state so the first read exercises the recovery path.
storage.set('update:state', 'not json');

let online = true;

mock.module('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (key: string) => storage.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: async (key: string) => {
      storage.delete(key);
    },
  },
}));
mock.module('expo-constants', () => ({
  default: { expoConfig: { version: '1.1.3' } },
}));
mock.module('@react-native-community/netinfo', () => ({
  default: {
    fetch: async () => ({
      isConnected: online,
      isInternetReachable: online,
    }),
  },
}));

const REPO_RELEASE = {
  tag_name: 'v1.2.0',
  assets: [
    {
      name: 'inkuru.apk',
      browser_download_url:
        'https://github.com/fn-cafeina/inkuru/releases/download/v1.2.0/inkuru.apk',
      size: 6_000_000,
    },
  ],
};

let fetchCalls = 0;
let nextStatus = 200;
let lastHeaders = new Headers();

const fetchMock = async (
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> => {
  fetchCalls += 1;
  lastHeaders = new Headers(init?.headers);
  assert(
    String(input).includes('/releases/latest'),
    'the check hits the latest-release endpoint',
  );
  assertEqual(
    lastHeaders.get('user-agent'),
    'inkuru',
    'the API needs an application identity',
  );

  if (nextStatus === 304) {
    return new Response(null, { status: 304 });
  }

  if (nextStatus === 404) {
    return new Response(null, { status: 404 });
  }

  if (nextStatus === 500) {
    return new Response(null, { status: 500 });
  }

  return new Response(JSON.stringify(REPO_RELEASE), {
    status: 200,
    headers: { etag: '"tag-1"' },
  });
};

globalThis.fetch = fetchMock;

const check = await import('./check');

// Two concurrent checks share one request, and a corrupted stored state must
// not break the first round trip.
await Promise.all([check.checkForUpdate(true), check.checkForUpdate(true)]);

assertEqual(fetchCalls, 1, 'concurrent checks share one request');
assertEqual(
  check.getUpdateState().available?.tag ?? null,
  'v1.2.0',
  'a newer release is offered with its APK url',
);
assertEqual(
  check
    .getUpdateState()
    .available?.apkUrl?.includes('/inkuru.apk') ?? false,
  true,
  'the release points at the CI APK',
);

// Inside the throttle window the second check spends no request, but the
// stored release keeps showing after a cold-start style read.
nextStatus = 500;
await check.checkForUpdate();

assertEqual(fetchCalls, 1, 'the window not elapsed spends no request');
assertEqual(
  check.getUpdateState().available?.tag ?? null,
  'v1.2.0',
  'the stored release keeps showing',
);

// A 304 reuses the stored etag and keeps the release without spending quota.
nextStatus = 304;
await check.checkForUpdate(true);

assertEqual(fetchCalls, 2, 'a forced check does the round trip');
assertEqual(
  lastHeaders?.get('if-none-match') ?? null,
  '"tag-1"',
  'the stored etag is sent back',
);
assertEqual(
  check.getUpdateState().available?.tag ?? null,
  'v1.2.0',
  'a 304 keeps the release',
);

// A server error is a visible failure and does not erase the last release.
nextStatus = 500;
await check.checkForUpdate(true);

assertEqual(
  check.getUpdateState().failure,
  'No se pudo conectar con GitHub. Reintentá más tarde.',
  'a server error is a visible failure',
);
assertEqual(
  check.getUpdateState().available?.tag ?? null,
  'v1.2.0',
  'the failure does not erase the release',
);

// A 404 (no releases) clears the stored release, and the next request goes
// out without the old etag.
nextStatus = 404;
await check.checkForUpdate(true);

assertEqual(
  check.getUpdateState().available,
  null,
  'without releases there is nothing to offer',
);

nextStatus = 200;
await check.checkForUpdate(true);

assertEqual(
  lastHeaders?.get('if-none-match'),
  null,
  'the 404 cleared the etag',
);
assertEqual(
  check.getUpdateState().available?.tag ?? null,
  'v1.2.0',
  'a fresh 200 offers the release again',
);

// A forced check without a connection reports offline and spends nothing.
online = false;
await check.checkForUpdate(true);

assertEqual(fetchCalls, 5, 'an offline check spends no request');
assertEqual(
  check.getUpdateState().failure,
  'Sin conexión',
  'an offline forced check says so',
);
online = true;

// With the auto-check off a background check spends no request.
await check.setAutoCheck(false);
nextStatus = 500;
await check.checkForUpdate();

assertEqual(fetchCalls, 5, 'auto-check off spends no request');
assertEqual(check.getUpdateState().autoCheck, false, 'the toggle persists');

console.log('update check ok');
