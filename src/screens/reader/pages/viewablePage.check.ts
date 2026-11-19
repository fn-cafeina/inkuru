import { viewablePage } from './viewablePage';

function assertEqual<T>(actual: T, expected: T, label: string): void {
  if (actual !== expected) {
    throw new Error(
      `${label}: expected ${String(expected)}, received ${String(actual)}`,
    );
  }
}

// A normal page report is the page itself.
assertEqual(viewablePage(0, 40), 0, 'the first page is reported as is');
assertEqual(viewablePage(38, 40), 38, 'a middle page is reported as is');

// The end card: a fast fling can land on it, skipping the last page.
assertEqual(viewablePage(40, 40), 39, 'the end card reports the last page');
assertEqual(viewablePage(41, 40), 39, 'anything past the end reports the last page');

// A one page chapter behind the end card still resolves to its only page.
assertEqual(viewablePage(1, 1), 0, 'the end card of a one page chapter reports page 0');

// Nothing to report yet.
assertEqual(viewablePage(undefined, 40), null, 'no viewable item reports nothing');
assertEqual(viewablePage(0, 0), null, 'an empty chapter reports nothing');

console.log('reader viewable page ok');
