import { GRID_GAP, SCREEN_PADDING } from './spacing';

export const CARD_GAP = GRID_GAP;

/** Width of one card in the 3-column manga grid for a given screen width. */
export const mangaCardWidth = (width: number) =>
  Math.floor(
    (width - SCREEN_PADDING * 2 - CARD_GAP * 2) / 3,
  );
