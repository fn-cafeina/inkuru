import fixture from './__fixtures__/release.json';
import { isNewerVersion, parseRelease, shouldCheck } from './release';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual<T>(actual: T, expected: T, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label}: esperado ${String(expected)}, recibido ${String(actual)}`);
  }
}

const release = parseRelease(fixture);

assert(release !== null, 'release con APK debe parsear');
assertEqual(
  release.apkUrl,
  'https://github.com/fn-cafeina/inkuru/releases/download/v1.1.0/inkuru.apk',
  'url del APK',
);
assertEqual(release.tag, 'v1.1.0', 'tag');

assert(parseRelease(null) === null, 'null no es release');
assert(parseRelease('v1.1.0') === null, 'string no es release');
assert(parseRelease({ tag_name: 'v1.1.0' }) === null, 'sin assets no es release');
assert(parseRelease({ assets: fixture.assets }) === null, 'sin tag no es release');
assert(
  parseRelease({
    tag_name: 'v1.1.0',
    assets: [{ name: 'notes.txt', browser_download_url: 'https://x/notes.txt' }],
  }) === null,
  'release sin APK no sirve para instalar',
);

assert(isNewerVersion('v1.0.1', '1.0.0'), '1.0.1 sobre 1.0.0');
assert(isNewerVersion('v1.1.0', '1.0.9'), '1.1.0 sobre 1.0.9');
assert(isNewerVersion('v1.0.10', '1.0.9'), '1.0.10 sobre 1.0.9 (no léxico)');
assert(isNewerVersion('v1.0.1', '1.0'), 'relleno de ceros: 1.0.1 sobre 1.0');
assert(!isNewerVersion('v1.0.0', '1.0.0'), 'misma versión no es nueva');
assert(!isNewerVersion('v1.0', '1.0.0'), '1.0 equivale a 1.0.0');
assert(!isNewerVersion('v1.0.0', '1.0'), '1.0.0 equivale a 1.0 (relleno)');
assert(!isNewerVersion('v0.9.0', '1.0.0'), '0.9.0 sobre 1.0.0 no');
assert(!isNewerVersion('garbage', '1.0.0'), 'tag ilegible no es nueva');
assert(!isNewerVersion('v1.0.0-rc1', '1.0.0'), 'sufijo no numérico no compara');
assert(!isNewerVersion('', '1.0.0'), 'tag vacío no compara');

const now = 1_700_000_000_000;
const hour = 60 * 60 * 1000;

assert(shouldCheck(null, now), 'nunca comprobado debe comprobar');
assert(!shouldCheck(now - hour, now), 'dentro de la ventana no vuelve a consultar');
assert(shouldCheck(now - 6 * hour, now), 'ventana cumplida vuelve a consultar');
assert(shouldCheck(now - 6 * hour - 1, now), 'borde de la ventana consulta');

console.log('release ok');