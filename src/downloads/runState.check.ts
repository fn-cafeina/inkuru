import { createRunTracker } from './runState';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual<T>(actual: T, expected: T, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label}: esperado ${String(expected)}, recibido ${String(actual)}`);
  }
}

const runs = createRunTracker();
const first = runs.start('/chapter/1');

assertEqual(first, 1, 'primera generación');
assert(runs.isCurrent('/chapter/1', first), 'la corrida arranca vigente');
assert(runs.canWrite('/chapter/1', first), 'la corrida puede escribir');

const second = runs.start('/chapter/1');

assert(!runs.isCurrent('/chapter/1', first), 'una corrida nueva invalida la anterior');
assert(runs.isCurrent('/chapter/1', second), 'la corrida nueva está vigente');
assert(!runs.canWrite('/chapter/1', first), 'la corrida vieja no escribe');

runs.cancel('/chapter/1');

assert(!runs.isCurrent('/chapter/1', second), 'cancelar invalida la corrida');
assert(!runs.canWrite('/chapter/1', second), 'cancelar bloquea escrituras');
assertEqual(runs.consumeCancel('/chapter/1'), true, 'cancela consumida');
assertEqual(runs.consumeCancel('/chapter/1'), false, 'cancela consumida una sola vez');

const deleted = runs.start('/chapter/2');

runs.cancel('/chapter/2');

assert(!runs.isCurrent('/chapter/2', deleted), 'borrar invalida la corrida');
assert(!runs.canWrite('/chapter/2', deleted), 'borrar bloquea escrituras');

const failed = runs.start('/chapter/3');

runs.fail('/chapter/3');

assert(runs.isCurrent('/chapter/3', failed), 'una falla mantiene la corrida vigente');
assert(!runs.canWrite('/chapter/3', failed), 'una falla bloquea escrituras');
assertEqual(runs.consumeCancel('/chapter/3'), false, 'una falla no es una cancelación');

runs.finish('/chapter/3', failed);

assert(!runs.isCurrent('/chapter/3', failed), 'finish limpia la corrida');

const oldRun = runs.start('/chapter/4');
const currentRun = runs.start('/chapter/4');

runs.finish('/chapter/4', oldRun);

assert(runs.isCurrent('/chapter/4', currentRun), 'un finish viejo se ignora');

console.log('download run state ok');
