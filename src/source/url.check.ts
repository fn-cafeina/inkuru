import { absoluteUrl, toPath } from './url';

function assertEqual<T>(actual: T, expected: T, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

// A route parameter reaches the fetcher, so a deep link must not be able to
// name another host. `toPath` is the only thing standing between the two.
assertEqual(
  toPath('https://otro-host.example/x'),
  '/x',
  'a foreign absolute url is cut down to its path',
);
assertEqual(
  toPath('https://zonatmo.org/v/1'),
  '/v/1',
  'a site url is cut down to its path',
);
assertEqual(toPath('/library/manga'), '/library/manga', 'a path stays a path');

assertEqual(
  absoluteUrl(toPath('https://otro-host.example/x')),
  'https://zonatmo.org/x',
  'a foreign url ends up fetched from the site',
);
assertEqual(
  absoluteUrl('//otro-host.example/x'),
  'https://zonatmo.org//otro-host.example/x',
  'a protocol relative path stays on the site',
);
assertEqual(absoluteUrl('/v/1'), 'https://zonatmo.org/v/1', 'a path gets the site root');
assertEqual(
  absoluteUrl('http://zonatmo.org/a.jpg'),
  'https://zonatmo.org/a.jpg',
  'cleartext is upgraded, android blocks it',
);
assertEqual(
  absoluteUrl('https://cdn.example/a.jpg'),
  'https://cdn.example/a.jpg',
  'an absolute image url is left alone',
);

console.log('source urls ok');
