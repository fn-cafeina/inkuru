import { PixelRatio } from 'react-native';

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
  source,
  scaleMode,
  paged,
}: {
  ratio: number;
  width: number;
  height: number;
  source: SourceSize | null;
  scaleMode: ReaderScale;
  paged: boolean;
}): { baseWidth: number; baseHeight: number } {
  const fitWidth = width;
  const fitHeight = width / ratio;

  if (!paged) {
    return { baseWidth: fitWidth, baseHeight: fitHeight };
  }

  switch (scaleMode) {
    case 'fit-width':
      return { baseWidth: fitWidth, baseHeight: fitHeight };
    case 'fit-height':
      return { baseWidth: height * ratio, baseHeight: height };
    case 'fill':
      // Cover the viewport and crop the overflow.
      return ratio >= width / height
        ? { baseWidth: height * ratio, baseHeight: height }
        : { baseWidth: fitWidth, baseHeight: fitHeight };
    case 'original': {
      // Physical pixels mapped back to points, so nothing is upscaled.
      const density = PixelRatio.get();

      return {
        baseWidth: (source?.width ?? width) / density,
        baseHeight: (source?.height ?? height) / density,
      };
    }
    case 'stretch':
      return { baseWidth: width, baseHeight: height };
    case 'fit-screen':
    default:
      return ratio >= width / height
        ? { baseWidth: fitWidth, baseHeight: fitHeight }
        : { baseWidth: height * ratio, baseHeight: height };
  }
}
