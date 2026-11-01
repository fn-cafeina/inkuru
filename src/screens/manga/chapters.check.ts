import {
  ascendingChapters,
  chunkChapters,
  displayChapters,
  getChapterState,
} from './chapters';
import type { MangaChapter } from '../../source/zonatmo';

function assertEqual<T>(actual: T, expected: T, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label}: esperado ${String(expected)}, recibido ${String(actual)}`);
  }
}

function chapter(number: number): MangaChapter {
  return { title: `Capítulo ${number}`, path: `/view_uploads/${number}` };
}

function range(size: number, from = 1): MangaChapter[] {
  return Array.from({ length: size }, (_, index) => chapter(from + index));
}

const newestFirst = range(3).reverse();

assertEqual(
  ascendingChapters(newestFirst).map((item) => item.path).join(),
  range(3).map((item) => item.path).join(),
  'el orden ascendente invierte el más nuevo primero',
);
assertEqual(
  displayChapters(range(3), 'asc')[0]?.path,
  chapter(1).path,
  'ascendente respeta el orden recibido',
);
assertEqual(
  displayChapters(range(3), 'desc')[0]?.path,
  chapter(3).path,
  'descendente invierte',
);

assertEqual(chunkChapters([]).length, 0, 'sin capítulos no hay rangos');

const single = chunkChapters([chapter(7)]);

assertEqual(single.length, 1, 'un capítulo forma un rango');
assertEqual(single[0]?.label, '7', 'un solo capítulo usa su número');

const decimal = chunkChapters([{ title: 'Capítulo 12,5', path: '/x' }]);

assertEqual(decimal[0]?.label, '12.5', 'se acepta coma decimal');

const unnumbered = chunkChapters([{ title: 'Extra', path: '/x' }]);

assertEqual(unnumbered[0]?.label, '1-1', 'sin números usa la posición');

const ranges = chunkChapters(range(120));

assertEqual(ranges.length, 3, '120 capítulos forman 3 rangos');
assertEqual(ranges[0]?.chapters.length, 50, 'el primer rango está lleno');
assertEqual(ranges[2]?.chapters.length, 20, 'el último rango lleva el resto');
assertEqual(ranges[0]?.label, '1-50', 'etiqueta del primer rango');
assertEqual(ranges[1]?.label, '51-100', 'etiqueta del rango medio');
assertEqual(ranges[2]?.label, '101-120', 'etiqueta del último rango');

const read = new Set(['/view_uploads/1']);

assertEqual(
  getChapterState('/view_uploads/1', '/view_uploads/1', read),
  'current',
  'el capítulo actual gana al leído',
);
assertEqual(
  getChapterState('/view_uploads/1', '/view_uploads/2', read),
  'read',
  'un capítulo leído se marca',
);
assertEqual(
  getChapterState('/view_uploads/3', '/view_uploads/2', read),
  undefined,
  'un capítulo sin marca no tiene estado',
);

console.log('chapter ranges ok');
