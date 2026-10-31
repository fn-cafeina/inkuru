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

console.log('timeout ok');
