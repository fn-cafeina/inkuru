import { CATALOG_EMPTY_FIXTURE, CATALOG_FIXTURE } from './__fixtures__/catalog';
import { MANGA_FIXTURE } from './__fixtures__/manga';
import { READER_FIXTURE } from './__fixtures__/reader';
import { SEARCH_FIXTURE } from './__fixtures__/search';
import { parseCatalog, parseManga, parseReader, parseSearch } from './leercapitulo';

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

function item<T>(values: readonly T[], index: number): T {
  const value = values[index];

  if (value === undefined) {
    throw new Error(`Índice ${index} fuera de rango`);
  }

  return value;
}

function expectThrow(fn: () => void, label: string): void {
  let rejected = false;

  try {
    fn();
  } catch {
    rejected = true;
  }

  assert(rejected, label);
}

const manga = parseManga(MANGA_FIXTURE);

assertEqual(manga.title, 'One Piece', 'título del manga');
assertEqual(
  manga.cover,
  'https://www.leercapitulo.co/covers/4f/1067e3fadaf8ec9edd6b71368445a7.jpg?v1792459668816',
  'portada del manga',
);
assertEqual(manga.tags.join('|'), 'Action|Adventure|Martial Arts', 'tags del manga');
assertEqual(manga.facts.length, 6, 'facts del manga');
assertEqual(
  manga.facts.find((fact) => fact.label === 'Estado')?.value,
  'Ongoing',
  'estado',
);
assertEqual(
  manga.facts.find((fact) => fact.label === 'Demografia')?.value,
  'Shōnen',
  'demografía',
);
assertEqual(
  manga.facts.find((fact) => fact.label === 'Capitulos')?.value,
  '1272',
  'capítulos del manga',
);
assertEqual(
  manga.facts.find((fact) => fact.label === 'Autor')?.value,
  'Oda Eiichirou (尾田栄一郎)',
  'autor',
);
assert(manga.synopsis.includes('"One Piece"'), 'sinopsis decodificada');
assertEqual(manga.chapters.length, 2, 'capítulos del manga');
assertEqual(
  item(manga.chapters, 0).path,
  '/leer/psvkfbmjgo/one-piece/1196/',
  'primer capítulo',
);
assertEqual(item(manga.chapters, 0).title, 'Capitulo 1196', 'título del primer capítulo');
assertEqual(item(manga.chapters, 0).date, '2026-10-17', 'fecha del primer capítulo');

const reader = parseReader(READER_FIXTURE);

assertEqual(reader.title, 'Capitulo 1195', 'título del lector');
assertEqual(reader.mangaTitle, 'One Piece', 'manga del lector');
assertEqual(reader.chapters.length, 3, 'capítulos del lector');
assertEqual(reader.chapterIndex, 1, 'índice del capítulo actual');
assertEqual(
  item(reader.chapters, reader.chapterIndex).title,
  'Capitulo 1195',
  'capítulo actual del lector',
);
assertEqual(reader.pages.length, 2, 'páginas del lector');
assertEqual(
  item(reader.pages, 0),
  'https://es2s12-2127.t34798ndc.com/B0C3Xdh/J6Y/Uy/Gb/xZ/PE/Pj/GG/sG/b2/mj/Zx/mN/29/qy/s2/29/ZN/eIZgRe5/EE9s/UE.dIk.jpg',
  'primera página',
);
assertEqual(
  reader.prev?.path,
  '/leer/psvkfbmjgo/one-piece/1194/',
  'capítulo anterior',
);
assertEqual(reader.prev?.title, 'Capitulo 1194', 'título anterior');
assertEqual(
  reader.next?.path,
  '/leer/psvkfbmjgo/one-piece/1196/',
  'capítulo siguiente',
);
assertEqual(reader.next?.title, 'Capitulo 1196', 'título siguiente');

const search = parseSearch(SEARCH_FIXTURE);

assertEqual(search.length, 2, 'resultados de búsqueda');
assertEqual(item(search, 0).title, 'One Piece Full Color', 'título de búsqueda');
assertEqual(
  item(search, 0).cover,
  'https://www.leercapitulo.co/covers/50/1ab355791858e5d163d1b9d69cf70c.jpg?v1793004892973',
  'portada de búsqueda',
);
assertEqual(
  item(search, 0).path,
  '/manga/7c12f0hx4w/one-piece-full-color/',
  'ruta de búsqueda',
);
assertEqual(
  item(search, 0).lastChapter,
  'Capitulo 1055',
  'último capítulo de búsqueda',
);
assertEqual(parseSearch('[]').length, 0, 'búsqueda vacía');
expectThrow(
  () => parseSearch('nope'),
  'JSON inválido de búsqueda debe lanzar error',
);
expectThrow(
  () => parseSearch('{}'),
  'búsqueda sin array debe lanzar error',
);

const catalog = parseCatalog(CATALOG_FIXTURE);

assertEqual(catalog.items.length, 2, 'mangas del catálogo');
assertEqual(item(catalog.items, 0).title, 'One Piece', 'título del catálogo');
assertEqual(
  item(catalog.items, 0).cover,
  'https://www.leercapitulo.co/covers/4f/1067e3fadaf8ec9edd6b71368445a7.jpg?v1793004892973',
  'portada del catálogo',
);
assertEqual(
  item(catalog.items, 0).path,
  '/manga/psvkfbmjgo/one-piece/',
  'ruta del catálogo',
);
assertEqual(
  item(catalog.items, 0).lastChapter,
  'Capitulo 1196',
  'último capítulo del catálogo',
);
assertEqual(
  item(catalog.items, 1).title,
  "To Hell with Being Heir, I'm going to Heal",
  'entidades HTML del catálogo',
);
assertEqual(catalog.hasMore, true, 'siguiente página del catálogo');

const emptyCatalog = parseCatalog(CATALOG_EMPTY_FIXTURE);

assertEqual(emptyCatalog.items.length, 0, 'catálogo vacío');
assertEqual(emptyCatalog.hasMore, false, 'catálogo vacío sin siguiente página');
expectThrow(
  () => parseCatalog('<main><p>sin datos</p></main>'),
  'HTML inválido del catálogo debe lanzar error',
);

expectThrow(
  () => parseManga('<main><p>sin datos</p></main>'),
  'HTML inválido del detalle debe lanzar error',
);
expectThrow(
  () => parseReader('<main class="lc-pages"></main>'),
  'HTML inválido del lector debe lanzar error',
);

console.log('parsers ok');
