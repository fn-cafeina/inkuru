export const CARD_GAP = 12;

/** Width of one card in the 3-column manga grid for a given screen width. */
export const mangaCardWidth = (width: number) =>
  Math.floor((width - 32 - CARD_GAP * 2) / 3);
