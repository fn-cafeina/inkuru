import { reachesLastPage } from './readerReadMark';

function assertEqual(actual: boolean, expected: boolean, label: string): void {
  if (actual !== expected) {
    throw new Error(
      `${label}: expected ${String(expected)}, received ${String(actual)}`,
    );
  }
}

// Reaching the last page is the finish signal, whatever the way in.
assertEqual(reachesLastPage(39, 40), true, 'the last page marks the chapter');
assertEqual(reachesLastPage(40, 40), true, 'an out of range page still counts');
assertEqual(reachesLastPage(38, 40), false, 'a page before the last does not');
assertEqual(reachesLastPage(0, 40), false, 'the first page does not mark');

// A one-page chapter only has a last page, so opening it finishes it.
assertEqual(reachesLastPage(0, 1), true, 'a single page chapter marks on open');

// Nothing to read, nothing to mark.
assertEqual(reachesLastPage(0, 0), false, 'an empty chapter marks nothing');

console.log('reader read mark ok');
