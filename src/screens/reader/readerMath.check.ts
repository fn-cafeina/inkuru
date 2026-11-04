import {
  knownPageRatio,
  pageBox,
  pageLayoutAt,
  rememberPageRatio,
} from './readerPageLayout';
import { READER_PAGE_ASPECT_RATIO } from '../../theme/layout';
import { clamp, translationBounds, zoomAroundPoint } from './readerZoom';

function assertEqual<T>(actual: T, expected: T, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label}: esperado ${String(expected)}, recibido ${String(actual)}`);
  }
}

assertEqual(clamp(5, 0, 10), 5, 'un valor dentro del rango pasa');
assertEqual(clamp(-1, 0, 10), 0, 'el mínimo recorta');
assertEqual(clamp(11, 0, 10), 10, 'el máximo recorta');

const noOverflow = translationBounds(100, 100, 200, 200, 1);

assertEqual(noOverflow.maxX, 0, 'sin desbordar no hay desplazamiento X');
assertEqual(noOverflow.maxY, 0, 'sin desbordar no hay desplazamiento Y');

const zoomed = translationBounds(200, 100, 100, 100, 2);

assertEqual(zoomed.maxX, 150, 'X permite la mitad del desbordamiento');
assertEqual(zoomed.maxY, 50, 'Y permite la mitad del desbordamiento');

// The content point under the focal point must stay under it after zooming.
const panned = zoomAroundPoint(1, 0, 0, 50, 20, 50, 20, 2);

assertEqual(panned.x, -50, 'el punto focal se mantiene en X');
assertEqual(panned.y, -20, 'el punto focal se mantiene en Y');

const continuous = pageBox({
  ratio: 0.5,
  width: 200,
  height: 100,
  scaleMode: 'fit-screen',
  paged: false,
});

assertEqual(continuous.baseWidth, 200, 'continuo siempre usa el ancho completo');
assertEqual(continuous.baseHeight, 400, 'continuo respeta la proporción');

const tallPage = pageBox({
  ratio: 0.5,
  width: 200,
  height: 100,
  scaleMode: 'fit-screen',
  paged: true,
});

assertEqual(tallPage.baseWidth, 50, 'paginado ajusta la altura');
assertEqual(tallPage.baseHeight, 100, 'paginado ajusta a la pantalla');

const widePage = pageBox({
  ratio: 3,
  width: 200,
  height: 100,
  scaleMode: 'fit-screen',
  paged: true,
});

assertEqual(widePage.baseWidth, 200, 'una página ancha ocupa el ancho');
assertEqual(widePage.baseHeight, 200 / 3, 'una página ancha respeta la proporción');

const fitWidth = pageBox({
  ratio: 3,
  width: 200,
  height: 100,
  scaleMode: 'fit-width',
  paged: true,
});

assertEqual(fitWidth.baseWidth, 200, 'fit-width ignora la altura en paginado');

// pageLayoutAt: real measured heights with an estimate fallback.
const noHeights = pageLayoutAt([], 3, 100);

assertEqual(noHeights.offset, 300, 'sin mediciones usa el fallback');
assertEqual(noHeights.length, 100, 'sin mediciones usa el fallback de alto');

const sparse = pageLayoutAt([120, 90], 3, 100);

assertEqual(sparse.offset, 310, 'suma mediciones y fallback para el resto');
assertEqual(sparse.length, 100, 'un índice sin medir usa el fallback');

const measured = pageLayoutAt([120, 90, 80, 200], 3, 100);

assertEqual(measured.offset, 290, 'suma solo las mediciones reales');
assertEqual(measured.length, 200, 'usa la altura real medida');

// ratio cache: a measured page keeps its proportion across row remounts.
assertEqual(
  knownPageRatio('page-1.jpg'),
  READER_PAGE_ASPECT_RATIO,
  'una página sin medir usa la proporción estimada',
);

rememberPageRatio('page-1.jpg', { width: 800, height: 1200 });

assertEqual(
  knownPageRatio('page-1.jpg'),
  800 / 1200,
  'una página medida conserva su proporción',
);

rememberPageRatio('page-2.jpg', { width: 0, height: 0 });

assertEqual(
  knownPageRatio('page-2.jpg'),
  READER_PAGE_ASPECT_RATIO,
  'un tamaño inválido no se cachea',
);

// The cache is capped oldest-first.
for (let index = 0; index < 500; index += 1) {
  rememberPageRatio(`page://${index}`, { width: 1442, height: 2100 });
}

rememberPageRatio('page://500', { width: 1442, height: 2100 });

assertEqual(
  knownPageRatio('page://0'),
  READER_PAGE_ASPECT_RATIO,
  'la página más antigua se evicta del caché',
);
assertEqual(
  knownPageRatio('page://500'),
  1442 / 2100,
  'la página más reciente se conserva',
);

console.log('reader geometry ok');
