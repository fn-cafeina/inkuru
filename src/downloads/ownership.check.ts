import { hashKey, isChapterDirName } from './ownership';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const path = '/library/manga/8232/one-punch-man';
const base = hashKey(path);

assert(/^[0-9a-f]{8}$/.test(base), 'hashKey produce 8 dígitos hexadecimales');
assert(hashKey(path) === base, 'hashKey es estable');
assert(hashKey(`${path}-x`) !== base, 'rutas distintas dan hashes distintos');

assert(isChapterDirName(path, base), 'nombre base pertenece al capítulo');
assert(isChapterDirName(path, `${base}-2`), 'sufijo de colisión pertenece');
assert(isChapterDirName(path, `${base}-100`), 'sufijo alto pertenece');
assert(
  !isChapterDirName(path, `${base}-x`),
  'sufijo no numérico no pertenece',
);
assert(
  !isChapterDirName(path, `${base}-2-3`),
  'sufijo doble no pertenece',
);
assert(
  !isChapterDirName('/chapter/other', base),
  'otro capítulo no reclama el nombre',
);

console.log('download directory names ok');
