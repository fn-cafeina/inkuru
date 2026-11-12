export type ReaderBackState = {
  /** A sheet is open over the reader. */
  sheetOpen: boolean;
  /** The reader chrome is drawn and can be hidden. */
  chromeVisible: boolean;
  /** Both the chapter and the saved preferences are resolved. */
  ready: boolean;
};

/**
 * Whether the reader owns the hardware back gesture for this press.
 *
 * A press is consumed when there is something on screen to dismiss: a sheet, or
 * the chrome. While the first chapter is still loading there is neither, and
 * consuming the press only hid a chrome the skeleton does not own, so it looked
 * like back was broken.
 */
export function readerConsumesBack({
  sheetOpen,
  chromeVisible,
  ready,
}: ReaderBackState): boolean {
  if (sheetOpen) {
    return true;
  }

  return ready && chromeVisible;
}
