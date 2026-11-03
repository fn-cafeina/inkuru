import type { ReaderScale } from '../../storage/readerSettings';

export type SourceSize = { width: number; height: number };

/**
 * Page box in points. Paged mode honours the page-fitting preference;
 * continuous mode always uses the full width so pages stack without gaps.
 */
export function pageBox({
  ratio,
  width,
  height,
  scaleMode,
  paged,
}: {
  ratio: number;
  width: number;
  height: number;
  scaleMode: ReaderScale;
  paged: boolean;
}): { baseWidth: number; baseHeight: number } {
  const fitWidth = width;
  const fitHeight = width / ratio;

  if (!paged || scaleMode === 'fit-width') {
    return { baseWidth: fitWidth, baseHeight: fitHeight };
  }

  return ratio >= width / height
    ? { baseWidth: fitWidth, baseHeight: fitHeight }
    : { baseWidth: height * ratio, baseHeight: height };
}

/**
 * Layout of one vertical-mode row. Real heights come from measured rows;
 * anything not measured yet falls back to the estimated uniform height, so
 * the list geometry matches the rendered content once the images load.
 */
export function pageLayoutAt(
  heights: number[],
  index: number,
  fallback: number,
): { length: number; offset: number; index: number } {
  let offset = 0;

  for (let i = 0; i < index; i++) {
    offset += heights[i] ?? fallback;
  }

  return { length: heights[index] ?? fallback, offset, index };
}
