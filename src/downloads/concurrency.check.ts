import {
  assert,
  assertEqual,
  manager,
  net,
  waitFor,
} from './__fixtures__/managerHarness';

/**
 * Concurrency 1 is the default and the one every user meets first: a queue
 * filled faster than the single worker drains it must still finish, and a run
 * that fails must not strand the chapters behind it.
 */

let open = 0;
let peak = 0;

net.fetchImpl = async (path: string) => {
  open += 1;
  peak = Math.max(peak, open);
  await new Promise((resolve) => setTimeout(resolve, 5));
  open -= 1;

  if (path === '/view_uploads/one-fails') {
    throw new Error('boom');
  }

  return {
    title: path,
    pages: ['https://cdn.zonatmo.org/15/1.webp'],
    chapters: [{ title: path, path }],
    chapterIndex: 0,
  };
};

manager.setDownloadConcurrency(1);

const paths = [
  '/view_uploads/one-fails',
  '/view_uploads/one-a',
  '/view_uploads/one-b',
];

for (const path of paths) {
  await manager.enqueueDownload({
    chapterPath: path,
    chapterTitle: path,
    mangaPath: '/library/manga/7/one',
    mangaTitle: 'Manga',
  });
}

await waitFor(
  () => manager.getDownloadState('/view_uploads/one-b')?.status === 'done',
  'the single worker drains the whole queue',
);

assertEqual(
  manager.getDownloadState('/view_uploads/one-fails')?.status,
  'failed',
  'the failing chapter is marked failed, not left queued',
);
assertEqual(
  manager.getDownloadState('/view_uploads/one-a')?.status,
  'done',
  'the chapter behind the failure still downloads',
);
assertEqual(peak, 1, 'one chapter fetches at a time');
assert(net.calls >= 3, 'every queued chapter was requested');

console.log('download concurrency ok');
