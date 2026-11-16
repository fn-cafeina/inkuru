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

/** The flows are async and fire-and-forget; poll until the state lands. */
async function waitFor(predicate: () => boolean, label: string): Promise<void> {
  const started = Date.now();

  while (!predicate()) {
    if (Date.now() - started > 5000) {
      throw new Error(`timeout: ${label}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 5));
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

const haptics: string[] = [];
mock.module('@react-native-async-storage/async-storage', () => ({
  default: asyncStorage,
}));
mock.module('expo-haptics', () => ({
  NotificationFeedbackType: { Error: 'error', Success: 'success' },
  notificationAsync: async (type: string) => {
    haptics.push(type);
  },
}));

let available: { tag: string; apkUrl: string } | null = null;
mock.module('./check', () => ({
  getUpdateState: () => ({ available }),
}));

const RELEASE = 'https://github.com/inkuru/releases/v1.2.0.apk';
type Downloaded = { file: { uri: string }; cancelled: boolean };
let downloads = 0;
let installCalls = 0;
// Property access keeps the flow from narrowing the signal away: it is
// assigned inside the hangingDownload closure.
const inFlight = { signal: null as AbortSignal | null };
// Settles only when its signal aborts, so the tests can inspect the
// mid-download state; a cancelled download settles as cancelled:true, as
// the real downloadApk does under the watchdog.
const hangingDownload = (url: string, signal: AbortSignal): Promise<Downloaded> =>
  new Promise((resolve) => {
    downloads += 1;
    inFlight.signal = signal;
    signal.addEventListener(
      'abort',
      () => resolve({ file: { uri: url }, cancelled: true }),
      { once: true },
    );
  });
let downloadImpl: (url: string, signal: AbortSignal) => Promise<Downloaded> =
  async (url) => {
    downloads += 1;
    return { file: { uri: url }, cancelled: false };
  };
let installImpl: () => Promise<'installed' | 'cancelled'> = async () => {
  installCalls += 1;
  return 'installed';
};
mock.module('./install', () => ({
  downloadApk: (url: string, signal: AbortSignal) => downloadImpl(url, signal),
  installApk: async () => installImpl(),
  openInstallPermissionSettings: async () => {},
}));

const flow = await import('./flow');

// No stored grant: the first confirmation must ask for the permission.
await flow.initFlow();
assertEqual(
  flow.getFlowState().installPermissionGranted,
  false,
  'no stored grant starts ungranted',
);

available = null;
flow.openUpdate();
assertEqual(flow.getFlowState().phase, 'idle', 'no release, nothing opens');

available = { tag: 'v1.2.0', apkUrl: RELEASE };
flow.openUpdate();
assertEqual(flow.getFlowState().phase, 'confirm', 'the sheet confirms');

await flow.confirmUpdate();
assertEqual(
  flow.getFlowState().phase,
  'permission',
  'an ungranted confirm asks for the permission',
);

// Granting in the settings screen starts the download on the way back.
await flow.grantPermissionAndDownload();

assertEqual(downloads, 1, 'the grant started one download');
assertEqual(installCalls, 1, 'the accepted installer installed once');
assertEqual(flow.getFlowState().phase, 'ready', 'an accepted install is ready');
assertEqual(
  flow.getFlowState().installPermissionGranted,
  true,
  'the grant is remembered',
);
assertEqual(
  flow.getFlowState().resumeAfterPermission,
  false,
  'the resume arm is dropped after the download starts',
);
assertEqual(storage.get('update:installPermission'), 'true', 'grant persisted');
assertEqual(haptics.join(), 'success', 'a success haptic fired');

// Dismissing the installer is the user's call, not an error.
available = { tag: 'v1.3.0', apkUrl: RELEASE };
installImpl = async () => {
  installCalls += 1;
  return 'cancelled';
};
flow.openUpdate();
await flow.confirmUpdate();

assertEqual(downloads, 2, 'the retry downloaded again');
assertEqual(flow.getFlowState().phase, 'idle', 'a dismissed installer idles');
assertEqual(flow.getFlowState().failure, null, 'a dismissal is not a failure');

// A failed install intent re-arms the permission ask instead of failing
// silently forever.
available = { tag: 'v1.4.0', apkUrl: RELEASE };
installImpl = async () => {
  installCalls += 1;
  throw new Error('install intent failed');
};
flow.openUpdate();
await flow.confirmUpdate();

assertEqual(flow.getFlowState().phase, 'error', 'a failed install errors');
assertEqual(
  flow.getFlowState().installPermissionGranted,
  false,
  'a failed install forgets the grant',
);
assertEqual(storage.get('update:installPermission'), 'false', 'grant revoked');
assert(
  (flow.getFlowState().failure ?? '').includes('permiso'),
  'the failure names the permission',
);
assertEqual(haptics.join(), 'success,error', 'an error haptic fired');

// The error-phase retry routes through the permission step again.
await flow.confirmUpdate();
assertEqual(
  flow.getFlowState().phase,
  'permission',
  'the retry re-arms the permission step',
);

// A stalled download reports the watchdog message; the grant round trip
// keeps the flow in the granted state.
available = { tag: 'v1.5.0', apkUrl: RELEASE };
downloadImpl = async () => {
  downloads += 1;
  throw new Error('stalled');
};
await flow.grantPermissionAndDownload();

assertEqual(downloads, 4, 'the stalled round trip downloaded once');
assertEqual(flow.getFlowState().phase, 'error', 'a stalled download errors');
assertEqual(
  flow.getFlowState().failure,
  'La descarga se detuvo por conexión lenta. Reintentá cuando tengas mejor señal.',
  'the stall message comes from the watchdog',
);

// While a download is in flight the second confirm is a no-op.
available = { tag: 'v1.6.0', apkUrl: RELEASE };
downloadImpl = hangingDownload;
void flow.grantPermissionAndDownload();
await waitFor(
  () => flow.getFlowState().phase === 'downloading',
  'the download is in flight',
);

await flow.confirmUpdate();
assertEqual(downloads, 5, 'the second confirm started no extra download');

// Closing mid-download cancels it; the aborted download settles as
// cancelled and the sheet idles without a failure.
flow.closeUpdate();
assertEqual(inFlight.signal?.aborted, true, 'closing mid-download aborts the signal');
await waitFor(() => flow.getFlowState().phase === 'idle', 'the cancel lands');

assertEqual(
  flow.getFlowState().failure,
  null,
  'a cancelled download is not a failure',
);

console.log('update flow ok');
