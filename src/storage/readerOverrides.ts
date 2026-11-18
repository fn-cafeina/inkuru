import type {
  MangaReaderOverrides,
  ReaderMode,
  ReaderQuality,
  ReaderScale,
} from './readerSettings';

export type ReaderValues = {
  mode: ReaderMode;
  scale: ReaderScale;
  quality: ReaderQuality;
};

/**
 * A manga's own override beats the global setting, which beats the default.
 * Resolved per mount so a title's choice never becomes the next title's base.
 * Quality is not part of the overrides: it is a device-wide setting.
 */
export function resolveReaderValues(
  global: ReaderValues,
  overrides: MangaReaderOverrides | null,
): ReaderValues {
  return {
    mode: overrides?.mode ?? global.mode,
    scale: overrides?.scale ?? global.scale,
    quality: global.quality,
  };
}
