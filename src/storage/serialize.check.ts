import { withLock } from './serialize';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const order: number[] = [];

async function task(value: number, delay: number) {
  await new Promise((resolve) => setTimeout(resolve, delay));
  order.push(value);
}

const first = withLock('k', () => task(1, 20));
const second = withLock('k', () => task(2, 0));
const otherKey = withLock('other', () => task(3, 0));

await Promise.all([first, second, otherKey]);

assert(order[0] === 3, 'independent keys must not block each other');
assert(order[1] === 1, 'first task on a key must finish first');
assert(order[2] === 2, 'second task must wait for the first');

let failed = false;

await withLock('f', () => Promise.reject(new Error('boom'))).catch(() => {
  failed = true;
});

assert(failed, 'a failing task must still reject its caller');

const after = await withLock('f', () => Promise.resolve('ok'));

assert(after === 'ok', 'the queue must keep working after a failure');

console.log('serialize ok');
