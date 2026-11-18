import { resolveReaderValues } from './readerOverrides';
import type { ReaderValues } from './readerOverrides';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const defaults: ReaderValues = {
  mode: 'paged-rtl',
  scale: 'fit-screen',
  quality: 'balanced',
};

// A manga with no stored choice reads the global one, never a title's pick.
const leaked = resolveReaderValues(defaults, null);

assert(leaked.mode === 'paged-rtl', 'no override keeps the global mode');
assert(leaked.scale === 'fit-screen', 'no override keeps the global scale');
assert(leaked.quality === 'balanced', 'no override keeps the global quality');

// One field overridden leaves the other on the global values.
const partial = resolveReaderValues(defaults, { mode: 'webtoon' });

assert(partial.mode === 'webtoon', 'override wins for its own field');
assert(partial.scale === 'fit-screen', 'untouched fields stay global');

// Quality is device-wide: a per-manga entry can never change it.
const qualityGlobal = resolveReaderValues(
  { mode: 'paged-rtl', scale: 'fit-screen', quality: 'original' },
  { mode: 'webtoon', scale: 'fit-width' },
);

assert(qualityGlobal.mode === 'webtoon', 'the manga keeps its mode');
assert(qualityGlobal.scale === 'fit-width', 'the manga keeps its scale');
assert(qualityGlobal.quality === 'original', 'quality stays the global value');

// A stored global still beats the default for mangas without an override.
const custom = resolveReaderValues(
  { mode: 'paged-ltr', scale: 'fit-width', quality: 'original' },
  null,
);

assert(custom.mode === 'paged-ltr', 'global mode survives');
assert(custom.scale === 'fit-width', 'global scale survives');
assert(custom.quality === 'original', 'global quality survives');

console.log('reader overrides ok');
