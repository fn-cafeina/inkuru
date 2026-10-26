import { HOME_FIXTURE } from './__fixtures__/home';
import { MANGA_FIXTURE } from './__fixtures__/manga';
import { READER_FIXTURE } from './__fixtures__/reader';
import { parseHome, parseManga, parseReader } from './leercapitulo';

const home = parseHome(HOME_FIXTURE);

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

function expectThrow(fn: () => void, label: string): void {
  let rejected = false;

  try {
    fn();
  } catch {
    rejected = true;
  }

  assert(rejected, label);
}

assertEqual(home.trending.length, 2, 'tendencias');
assertEqual(home.trending[0].title, 'One Piece', 'título de tendencia');
assertEqual(
  home.trending[0].cover,
  'https://www.leercapitulo.co/covers/4f/1067e3fadaf8ec9edd6b71368445a7.jpg?v1793004892973',
  'portada absoluta',
);
assertEqual(
  home.trending[0].latestChapter?.path,
  '/leer/psvkfbmjgo/one-piece/1196/',
  'último capítulo de tendencia',
);
assertEqual(home.trending[1].title, 'Nanbaka', 'segunda tendencia');

assertEqual(home.releases.length, 2, 'lanzamientos');
assertEqual(home.releases[0].title, 'Subaru y Subaru', 'título de lanzamiento');
assertEqual(home.releases[0].chapters.length, 4, 'capítulos de lanzamiento');
assertEqual(home.releases[0].chapters[0].time, '24 mins', 'tiempo de capítulo');
assertEqual(
  home.releases[1].title,
  "To Hell with Being Heir, I'm going to Heal",
  'entidades HTML',
);

assertEqual(home.popular.length, 2, 'populares');
assertEqual(home.popular[0].title, 'One Piece', 'primer popular');
assertEqual(home.popular[1].lastChapter, 'Capitulo 279', 'último capítulo popular');

assertEqual(home.latest.length, 2, 'últimos mangas');
assertEqual(home.latest[0].title, 'Arrogant Slave', 'primer último manga');
assertEqual(home.latest[1].path, '/manga/czgmsoapjn/sannin-gurashi/', 'segundo último manga');

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
  manga.chapters[0].path,
  '/leer/psvkfbmjgo/one-piece/1196/',
  'primer capítulo',
);
assertEqual(manga.chapters[0].title, 'Capitulo 1196', 'título del primer capítulo');
assertEqual(manga.chapters[0].date, '2026-10-17', 'fecha del primer capítulo');

const reader = parseReader(READER_FIXTURE);

assertEqual(reader.title, 'Capitulo 1195', 'título del lector');
assertEqual(reader.pages.length, 2, 'páginas del lector');
assertEqual(
  reader.pages[0],
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

expectThrow(
  () => parseHome('<main><p>sin datos</p></main>'),
  'HTML inválido del inicio debe lanzar error',
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
