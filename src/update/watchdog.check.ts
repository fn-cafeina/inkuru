import {
  createDownloadWatchdog,
  downloadFailureMessage,
} from './watchdog';

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

async function until(condition: () => boolean, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (condition()) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  throw new Error('timed out waiting for the watchdog');
}

async function main(): Promise<void> {
  // No progress at all: the stall timer fires, not the hard timeout.
  const stalled = createDownloadWatchdog({ timeoutMs: 5000, stallMs: 40 });
  await until(() => stalled.reason() !== null, 1000);
  assertEqual(stalled.reason(), 'stalled', 'silent download stalls');
  assert(stalled.signal.aborted, 'stall aborts the download');
  stalled.done();

  // Progress keeps the stall timer alive until the hard timeout wins.
  const slow = createDownloadWatchdog({ timeoutMs: 200, stallMs: 60 });
  const ticks = setInterval(() => slow.progress(), 20);
  await until(() => slow.reason() !== null, 1000);
  clearInterval(ticks);
  assertEqual(slow.reason(), 'timeout', 'progress resets the stall, the timeout still fires');
  slow.done();

  // A user cancel wins immediately and is never overwritten.
  const cancelled = createDownloadWatchdog({ timeoutMs: 5000, stallMs: 50 });
  cancelled.cancel();
  assertEqual(cancelled.reason(), 'user', 'cancel is the user');
  cancelled.progress();
  await new Promise((resolve) => setTimeout(resolve, 80));
  assertEqual(cancelled.reason(), 'user', 'later ticks do not replace the user cancel');
  cancelled.done();

  // done() stops the timers: nothing fires after the download settles.
  const settled = createDownloadWatchdog({ timeoutMs: 40, stallMs: 40 });
  settled.done();
  await new Promise((resolve) => setTimeout(resolve, 120));
  assertEqual(settled.reason(), null, 'done stops the watchdog');

  assertEqual(
    downloadFailureMessage('stalled'),
    'La descarga se detuvo por conexión lenta. Reintentá cuando tengas mejor señal.',
    'stall message',
  );
  assertEqual(
    downloadFailureMessage('timeout'),
    'La descarga tardó demasiado. Reintentá con mejor conexión.',
    'timeout message',
  );
  assertEqual(
    downloadFailureMessage(null),
    'No se pudo completar la actualización.',
    'generic message',
  );

  console.log('watchdog ok');
}

void main();
