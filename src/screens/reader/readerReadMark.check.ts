import { reachesLastPage } from './readerReadMark';

function assertEqual<T>(actual: T, expected: T, label: string): void {
  if (actual !== expected) {
    throw new Error(
      `${label}: expected ${String(expected)}, received ${String(actual)}`,
    );
  }
}

const CH = '/view_uploads/1';
const OTHER = '/view_uploads/2';
const TOTAL = 40;

// The restored page is not a finish, whatever the previous chapter showed.
assertEqual(
  reachesLastPage(null, CH, TOTAL - 1, TOTAL),
  false,
  'restoring onto the last page marks nothing',
);
assertEqual(
  reachesLastPage({ path: OTHER, page: 5 }, CH, TOTAL - 1, TOTAL),
  false,
  'restoring onto the last page after another chapter marks nothing',
);
assertEqual(
  reachesLastPage({ path: OTHER, page: TOTAL - 1 }, CH, TOTAL - 1, TOTAL),
  false,
  'the same page in another chapter is not a forward move',
);

// Advancing into the last page is the honest finish signal.
assertEqual(
  reachesLastPage({ path: CH, page: TOTAL - 2 }, CH, TOTAL - 1, TOTAL),
  true,
  'advancing into the last page marks the chapter',
);
assertEqual(
  reachesLastPage({ path: CH, page: 0 }, CH, TOTAL - 1, TOTAL),
  true,
  'jumping from the first page to the last marks the chapter',
);

// Re-running the effect without a page change, or moving backwards, does not.
assertEqual(
  reachesLastPage({ path: CH, page: TOTAL - 1 }, CH, TOTAL - 1, TOTAL),
  false,
  're-rendering on the last page does not mark again',
);
assertEqual(
  reachesLastPage({ path: CH, page: TOTAL - 1 }, CH, TOTAL - 2, TOTAL),
  false,
  'stepping back off the last page does not mark',
);
assertEqual(
  reachesLastPage({ path: CH, page: 5 }, CH, 5, TOTAL),
  false,
  'a middle page does not mark',
);
assertEqual(reachesLastPage(null, CH, 9, 0), false, 'an empty chapter marks nothing');

console.log('reader read mark ok');
