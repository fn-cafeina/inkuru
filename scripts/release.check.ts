import { bumpVersions } from './release';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function didThrow(fn: () => unknown, message: string): void {
  let threw = false;
  try {
    fn();
  } catch {
    threw = true;
  }
  assert(threw, message);
}

const app = `${JSON.stringify(
  {
    expo: {
      name: 'Inkuru',
      slug: 'inkuru',
      version: '1.0.0',
      android: {
        package: 'com.inkuru.app',
        backgroundColor: '#fafafa',
      },
      plugins: [['expo-splash-screen', { resizeMode: 'contain' }]],
    },
  },
  null,
  2,
)}\n`;

const pkg = `${JSON.stringify(
  {
    name: 'inkuru',
    version: '1.0.0',
    private: true,
    dependencies: { expo: '~58.0.23' },
  },
  null,
  2,
)}\n`;

const [nextApp, nextPkg] = bumpVersions(app, pkg, '2.3.4');
const appOut = JSON.parse(nextApp) as { expo: Record<string, unknown> };
const pkgOut = JSON.parse(nextPkg) as Record<string, unknown>;

assert(appOut.expo.version === '2.3.4', 'expo.version changes');
assert(appOut.expo.name === 'Inkuru', 'expo.name stays intact');
assert(
  nextApp.includes('"package": "com.inkuru.app"'),
  'nested keys stay intact',
);
assert(
  nextApp.includes('\n  "expo": {'),
  'app.json is rewritten with 2-space indentation',
);
assert(nextApp.endsWith('\n'), 'app.json ends with a newline');
assert(pkgOut.version === '2.3.4', 'package.json version changes');
assert(pkgOut.private === true, 'package.json private stays intact');
assert(
  nextPkg.endsWith('\n'),
  'package.json ends with a newline',
);

const [again] = bumpVersions(nextApp, nextPkg, '9.9.9');
assert(
  again.includes('"version": "9.9.9"'),
  'a second bump overwrites the previous value',
);

didThrow(() => bumpVersions(app, pkg, '1.0'), 'an incomplete semver fails');
didThrow(
  () => bumpVersions(app, pkg, '1.0.1-beta.1'),
  'a prerelease fails',
);
didThrow(() => bumpVersions(app, pkg, 'v1.0.1'), 'a v prefix fails');
didThrow(() => bumpVersions('{}', pkg, '1.2.3'), 'no expo fails');
didThrow(() => bumpVersions('{oops', pkg, '1.2.3'), 'broken JSON fails');
didThrow(() => bumpVersions(app, '{oops', '1.2.3'), 'broken package.json fails');

console.log('release bump ok');