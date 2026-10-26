import { HOME_FIXTURE } from './__fixtures__/home';
import { parseHome } from './leercapitulo';

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

let rejected = false;
try {
  parseHome('<main><p>sin datos</p></main>');
} catch {
  rejected = true;
}
assert(rejected, 'HTML inválido debe lanzar error');

console.log('home parser ok');
