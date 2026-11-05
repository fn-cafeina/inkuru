import fixture from './__fixtures__/release.json';
import {
  formatCheckedAt,
  isNewerVersion,
  parseRelease,
  shouldCheck,
} from './release';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual<T>(actual: T, expected: T, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

const release = parseRelease(fixture);

assert(release !== null, 'a release with an APK parses');
assertEqual(
  release.apkUrl,
  'https://github.com/fn-cafeina/inkuru/releases/download/v1.1.0/inkuru.apk',
  'apk url',
);
assertEqual(release.tag, 'v1.1.0', 'tag');

assert(parseRelease(null) === null, 'null is not a release');
assert(parseRelease('v1.1.0') === null, 'a string is not a release');
assert(parseRelease({ tag_name: 'v1.1.0' }) === null, 'no assets is not a release');
assert(parseRelease({ assets: fixture.assets }) === null, 'no tag is not a release');
assert(
  parseRelease({
    tag_name: 'v1.1.0',
    assets: [{ name: 'notes.txt', browser_download_url: 'https://x/notes.txt' }],
  }) === null,
  'a release without an APK cannot install',
);

assert(isNewerVersion('v1.0.1', '1.0.0'), '1.0.1 over 1.0.0');
assert(isNewerVersion('v1.1.0', '1.0.9'), '1.1.0 over 1.0.9');
assert(isNewerVersion('v1.0.10', '1.0.9'), '1.0.10 over 1.0.9 (not lexical)');
assert(isNewerVersion('v1.0.1', '1.0'), 'zero padding: 1.0.1 over 1.0');
assert(!isNewerVersion('v1.0.0', '1.0.0'), 'the same version is not newer');
assert(!isNewerVersion('v1.0', '1.0.0'), '1.0 equals 1.0.0');
assert(!isNewerVersion('v1.0.0', '1.0'), '1.0.0 equals 1.0 (padding)');
assert(!isNewerVersion('v0.9.0', '1.0.0'), '0.9.0 is not over 1.0.0');
assert(!isNewerVersion('garbage', '1.0.0'), 'an unreadable tag is not newer');
assert(!isNewerVersion('v1.0.0-rc1', '1.0.0'), 'a non-numeric suffix does not compare');
assert(!isNewerVersion('', '1.0.0'), 'an empty tag does not compare');

const now = 1_700_000_000_000;
const hour = 60 * 60 * 1000;

assert(shouldCheck(null, now), 'never checked must check');
assert(!shouldCheck(now - hour, now), 'inside the window does not check again');
assert(shouldCheck(now - 6 * hour, now), 'window elapsed checks again');
assert(shouldCheck(now - 6 * hour - 1, now), 'the window edge checks');

const minute = 60 * 1000;

assertEqual(formatCheckedAt(now - 10_000, now), 'hace un momento', 'a recent minute');
assertEqual(formatCheckedAt(now - minute, now), 'hace 1 min', 'one minute ago');
assertEqual(formatCheckedAt(now - 45 * minute, now), 'hace 45 min', 'forty-five minutes ago');
assertEqual(formatCheckedAt(now - hour, now), 'hace 1 h', 'one hour ago');
assertEqual(formatCheckedAt(now - 5 * hour, now), 'hace 5 h', 'five hours ago');
assertEqual(formatCheckedAt(now - 24 * hour, now), 'hace 1 d', 'one day ago');
assertEqual(formatCheckedAt(now - 72 * hour, now), 'hace 3 d', 'three days ago');
assertEqual(formatCheckedAt(now + minute, now), 'hace un momento', 'the future is not negative');

console.log('release ok');
