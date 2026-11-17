import { withTimeout } from './timeout';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const controller = new AbortController();

// A synchronous throw must still clear the timer. If it leaked, the abort
// would fire later and kill an unrelated run sharing the controller.
await withTimeout(controller, 5, () => {
  throw new Error('sync boom');
}).catch(() => undefined);

await new Promise((resolve) => setTimeout(resolve, 20));

assert(!controller.signal.aborted, 'timer leaked and aborted the controller');

const value = await withTimeout(controller, 1000, () =>
  Promise.resolve('ok'),
);

assert(value === 'ok', 'resolved value must pass through');



// A task that ignores the abort must not pin the caller forever: with chapter
// concurrency 1 that stalled worker was every download the app had.
const stuck = new AbortController();
const started = Date.now();

await withTimeout(stuck, 20, () => new Promise<never>(() => undefined)).catch(
  (error: unknown) => error,
);

assert(Date.now() - started < 1000, 'a hung task must settle on its own timer');
assert(stuck.signal.aborted, 'the hung task still aborts its controller');



console.log('timeout ok');
