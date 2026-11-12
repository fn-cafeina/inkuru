import { readerConsumesBack } from './readerBack';

function assertEqual<T>(actual: T, expected: T, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

assertEqual(
  readerConsumesBack({ sheetOpen: false, chromeVisible: true, ready: false }),
  false,
  'back leaves while the first chapter loads',
);
assertEqual(
  readerConsumesBack({ sheetOpen: false, chromeVisible: true, ready: true }),
  true,
  'back hides the chrome once the chapter is ready',
);
assertEqual(
  readerConsumesBack({ sheetOpen: true, chromeVisible: true, ready: true }),
  true,
  'back closes an open sheet',
);
assertEqual(
  readerConsumesBack({ sheetOpen: true, chromeVisible: false, ready: true }),
  true,
  'a sheet is still dismissed when the chrome is hidden',
);
assertEqual(
  readerConsumesBack({ sheetOpen: false, chromeVisible: false, ready: true }),
  false,
  'back leaves when nothing is on screen',
);

console.log('reader back ownership ok');
