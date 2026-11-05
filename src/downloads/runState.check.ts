import { createRunTracker } from './runState';

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

const runs = createRunTracker();
const first = runs.start('/chapter/1');

assertEqual(first, 1, 'first generation');
assert(runs.isCurrent('/chapter/1', first), 'the run starts current');
assert(runs.canWrite('/chapter/1', first), 'the run can write');

const second = runs.start('/chapter/1');

assert(!runs.isCurrent('/chapter/1', first), 'a new run invalidates the previous one');
assert(runs.isCurrent('/chapter/1', second), 'the new run is current');
assert(!runs.canWrite('/chapter/1', first), 'the old run does not write');

runs.cancel('/chapter/1');

assert(!runs.isCurrent('/chapter/1', second), 'a cancel invalidates the run');
assert(!runs.canWrite('/chapter/1', second), 'a cancel blocks writes');
assertEqual(runs.consumeCancel('/chapter/1'), true, 'the cancel is consumed');
assertEqual(runs.consumeCancel('/chapter/1'), false, 'the cancel is consumed once');

const deleted = runs.start('/chapter/2');

runs.cancel('/chapter/2');

assert(!runs.isCurrent('/chapter/2', deleted), 'a delete invalidates the run');
assert(!runs.canWrite('/chapter/2', deleted), 'a delete blocks writes');

const failed = runs.start('/chapter/3');

runs.fail('/chapter/3');

assert(runs.isCurrent('/chapter/3', failed), 'a failure keeps the run current');
assert(!runs.canWrite('/chapter/3', failed), 'a failure blocks writes');
assertEqual(runs.consumeCancel('/chapter/3'), false, 'a failure is not a cancel');

runs.finish('/chapter/3', failed);

assert(!runs.isCurrent('/chapter/3', failed), 'finish clears the run');

const oldRun = runs.start('/chapter/4');
const currentRun = runs.start('/chapter/4');

runs.finish('/chapter/4', oldRun);

assert(runs.isCurrent('/chapter/4', currentRun), 'an old finish is ignored');

console.log('download run state ok');
