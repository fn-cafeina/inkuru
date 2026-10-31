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
