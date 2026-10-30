import { GRID_GAP, GRID_CARD_PADDING, SCREEN_PADDING } from './spacing';

export const CARD_GAP = GRID_GAP;

/** Width of one card in the 3-column manga grid for a given screen width. */
export const mangaCardWidth = (width: number) =>
  Math.floor(
    (width - SCREEN_PADDING * 2 - CARD_GAP * 2) / 3,
  );

/** Width of the cover inside a grid card (the card has 4dp of padding). */
export const mangaCoverWidth = (width: number) =>
  mangaCardWidth(width) - GRID_CARD_PADDING * 2;
