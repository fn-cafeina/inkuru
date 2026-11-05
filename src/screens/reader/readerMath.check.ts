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
    throw new Error(`${label}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

assertEqual(clamp(5, 0, 10), 5, 'a value inside the range passes');
assertEqual(clamp(-1, 0, 10), 0, 'the minimum clamps');
assertEqual(clamp(11, 0, 10), 10, 'the maximum clamps');

const noOverflow = translationBounds(100, 100, 200, 200, 1);

assertEqual(noOverflow.maxX, 0, 'no overflow means no X shift');
assertEqual(noOverflow.maxY, 0, 'no overflow means no Y shift');

const zoomed = translationBounds(200, 100, 100, 100, 2);

assertEqual(zoomed.maxX, 150, 'X allows half the overflow');
assertEqual(zoomed.maxY, 50, 'Y allows half the overflow');

// The content point under the focal point must stay under it after zooming.
const panned = zoomAroundPoint(1, 0, 0, 50, 20, 50, 20, 2);

assertEqual(panned.x, -50, 'the focal point holds in X');
assertEqual(panned.y, -20, 'the focal point holds in Y');

const continuous = pageBox({
  ratio: 0.5,
  width: 200,
  height: 100,
  scaleMode: 'fit-screen',
  paged: false,
});

assertEqual(continuous.baseWidth, 200, 'continuous always uses the full width');
assertEqual(continuous.baseHeight, 400, 'continuous respects the ratio');

const tallPage = pageBox({
  ratio: 0.5,
  width: 200,
  height: 100,
  scaleMode: 'fit-screen',
  paged: true,
});

assertEqual(tallPage.baseWidth, 50, 'paged adjusts to the height');
assertEqual(tallPage.baseHeight, 100, 'paged fits the screen');

const widePage = pageBox({
  ratio: 3,
  width: 200,
  height: 100,
  scaleMode: 'fit-screen',
  paged: true,
});

assertEqual(widePage.baseWidth, 200, 'a wide page takes the width');
assertEqual(widePage.baseHeight, 200 / 3, 'a wide page respects the ratio');

const fitWidth = pageBox({
  ratio: 3,
  width: 200,
  height: 100,
  scaleMode: 'fit-width',
  paged: true,
});

assertEqual(fitWidth.baseWidth, 200, 'fit-width ignores the height when paged');

// pageLayoutAt: real measured heights with an estimate fallback.
const noHeights = pageLayoutAt([], 3, 100);

assertEqual(noHeights.offset, 300, 'without measurements the fallback is used');
assertEqual(noHeights.length, 100, 'without measurements the height fallback is used');

const sparse = pageLayoutAt([120, 90], 3, 100);

assertEqual(sparse.offset, 310, 'measurements and fallback sum for the rest');
assertEqual(sparse.length, 100, 'an unmeasured index uses the fallback');

const measured = pageLayoutAt([120, 90, 80, 200], 3, 100);

assertEqual(measured.offset, 290, 'only the real measurements sum');
assertEqual(measured.length, 200, 'the real measured height is used');

// ratio cache: a measured page keeps its proportion across row remounts.
assertEqual(
  knownPageRatio('page-1.jpg'),
  READER_PAGE_ASPECT_RATIO,
  'an unmeasured page uses the estimated ratio',
);

rememberPageRatio('page-1.jpg', { width: 800, height: 1200 });

assertEqual(
  knownPageRatio('page-1.jpg'),
  800 / 1200,
  'a measured page keeps its ratio',
);

rememberPageRatio('page-2.jpg', { width: 0, height: 0 });

assertEqual(
  knownPageRatio('page-2.jpg'),
  READER_PAGE_ASPECT_RATIO,
  'an invalid size is not cached',
);

// The cache is capped oldest-first.
for (let index = 0; index < 500; index += 1) {
  rememberPageRatio(`page://${index}`, { width: 1442, height: 2100 });
}

rememberPageRatio('page://500', { width: 1442, height: 2100 });

assertEqual(
  knownPageRatio('page://0'),
  READER_PAGE_ASPECT_RATIO,
  'the oldest page is evicted from the cache',
);
assertEqual(
  knownPageRatio('page://500'),
  1442 / 2100,
  'the newest page is kept',
);

console.log('reader geometry ok');
