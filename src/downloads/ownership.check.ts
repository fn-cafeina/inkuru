import { ownsChapterPath } from './ownership';

function assertEqual<T>(actual: T, expected: T, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label}: esperado ${String(expected)}, recibido ${String(actual)}`);
  }
}

assertEqual(
  ownsChapterPath('/chapter/1', undefined),
  true,
  'una carpeta sin registro se puede usar',
);
assertEqual(
  ownsChapterPath('/chapter/1', '/chapter/1'),
  true,
  'la carpeta propia se puede usar',
);
assertEqual(
  ownsChapterPath('/chapter/1', '/chapter/2'),
  false,
  'una carpeta ajena se rechaza',
);
assertEqual(
  ownsChapterPath('/chapter/1', null),
  false,
  'un marcador ilegible se rechaza',
);

console.log('download ownership ok');
