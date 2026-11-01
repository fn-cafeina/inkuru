import { pageBox } from './readerPageLayout';
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

console.log('reader geometry ok');
