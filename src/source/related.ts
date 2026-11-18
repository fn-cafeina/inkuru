import { attribute, textWithClass } from './html';
import { absoluteUrl, toPath } from './url';

/** A card in the detail page's "Relacionados" carousel. */
export type RelatedManga = {
  path: string;
  title: string;
  cover: string;
  /** "manga", "manhwa" or "manhua" as the source tags it. */
  type?: string;
};

/**
 * The related carousel sits in its own block, and `rel-card` is used nowhere
 * else, so splitting on the card opener finds every item without nesting
 * bookkeeping. A card is cut at its first closing div: path, cover and title
 * all live above it.
 */
export function parseMangaRelated(html: string): RelatedManga[] {
  return html
    .split('<div class="rel-card"')
    .slice(1)
    .map(parseCard)
    .filter(isDefined);
}

function parseCard(chunk: string): RelatedManga | undefined {
  const opening = chunk.slice(0, chunk.indexOf('>') + 1);
  const head = chunk.slice(0, chunk.indexOf('</div>'));
  const anchor = head.match(/<a\b[^>]*>/i)?.[0];
  const rawPath = anchor ? attribute(anchor, 'href') : undefined;
  const title = textWithClass(head, 'h4', 'text-truncate');
  // The cover is a CSS background on a generated class, not an <img>.
  const cover = head.match(
    /background-image:\s*url\(\s*['"]?([^'")]+)/i,
  )?.[1];

  if (!rawPath || !title || !cover) {
    return undefined;
  }

  const path = toPath(rawPath);

  if (!path.startsWith('/library/')) {
    return undefined;
  }

  return {
    path,
    title,
    cover: absoluteUrl(cover),
    type: attribute(opening, 'data-zt-type'),
  };
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}
