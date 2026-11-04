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
        package: 'com.fncafeina.inkuru',
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

assert(appOut.expo.version === '2.3.4', 'expo.version debe cambiar');
assert(appOut.expo.name === 'Inkuru', 'expo.name debe quedar intacto');
assert(
  nextApp.includes('"package": "com.fncafeina.inkuru"'),
  'claves anidadas deben quedar intactas',
);
assert(
  nextApp.includes('\n  "expo": {'),
  'app.json debe reescribirse con indentación de 2 espacios',
);
assert(nextApp.endsWith('\n'), 'app.json debe terminar en salto de línea');
assert(pkgOut.version === '2.3.4', 'package.json version debe cambiar');
assert(pkgOut.private === true, 'package.json private debe quedar intacto');
assert(
  nextPkg.endsWith('\n'),
  'package.json debe terminar en salto de línea',
);

const [again] = bumpVersions(nextApp, nextPkg, '9.9.9');
assert(
  again.includes('"version": "9.9.9"'),
  'un segundo bumpeo debe pisar el valor anterior',
);

didThrow(() => bumpVersions(app, pkg, '1.0'), 'semver incompleto debe fallar');
didThrow(
  () => bumpVersions(app, pkg, '1.0.1-beta.1'),
  'prerelease debe fallar',
);
didThrow(() => bumpVersions(app, pkg, 'v1.0.1'), 'prefijo v debe fallar');
didThrow(() => bumpVersions('{}', pkg, '1.2.3'), 'sin expo debe fallar');
didThrow(() => bumpVersions('{oops', pkg, '1.2.3'), 'JSON roto debe fallar');
didThrow(() => bumpVersions(app, '{oops', '1.2.3'), 'JSON roto en package.json debe fallar');

console.log('release bump ok');