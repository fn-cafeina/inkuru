/**
 * The page the viewability report leaves the reader on. The end of chapter card
 * is an extra list item past the last page, and a fast fling can land straight
 * on it without ever stopping on the last page, so that report resolves to the
 * last page: reaching the card means the end, and it is the page whose progress
 * is worth restoring. `null` means there is nothing worth reporting yet.
 */
export function viewablePage(
  firstIndex: number | null | undefined,
  total: number,
): number | null {
  if (firstIndex == null || total <= 0) {
    return null;
  }

  return firstIndex >= total ? total - 1 : Math.max(0, firstIndex);
}
