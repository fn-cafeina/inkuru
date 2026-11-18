const ENTITIES: Record<string, string> = {
  amp: '&',
  apos: "'",
  gt: '>',
  hellip: '…',
  laquo: '«',
  lsaquo: '‹',
  rsaquo: '›',
  ldquo: '“',
  lsquo: '‘',
  lt: '<',
  mdash: '—',
  nbsp: ' ',
  ndash: '–',
  quot: '"',
  raquo: '»',
  rdquo: '”',
  rsquo: '’',
};

/**
 * Whole class tokens of an opening tag. The tag is a few hundred bytes, so a
 * regex on it is bounded work.
 */
function classNames(openingTag: string): string[] {
  const match = openingTag.match(/\bclass\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
  const value = match?.[1] ?? match?.[2];

  return value === undefined ? [] : value.split(/\s+/);
}

/** Whitespace, '>' or '/', so `<li` never matches `<line`. */
function isTagEnd(code: number): boolean {
  return (
    code === 32 ||
    code === 9 ||
    code === 10 ||
    code === 13 ||
    code === 47 ||
    code === 62 ||
    Number.isNaN(code)
  );
}

function tagAt(html: string, tag: string, from: number): number {
  const open = `<${tag}`;

  for (
    let at = html.indexOf(open, from);
    at >= 0;
    at = html.indexOf(open, at + 1)
  ) {
    if (isTagEnd(html.charCodeAt(at + open.length))) {
      return at;
    }
  }

  return -1;
}

type Opening = { start: number; end: number };

/**
 * Scans for an opening tag instead of matching a document-wide regex.
 *
 * The class-based regexes this replaces backtracked over every candidate tag
 * in the page (`[^>]*` plus two quoted alternatives plus `\b`). On a 2.5MB
 * manga page with 1241 chapters Hermes spent 100s inside parseManga; indexOf
 * keeps the work linear in the page size.
 */
function findOpening(
  html: string,
  tag: string,
  className: string | undefined,
): Opening | null {
  let at = tagAt(html, tag, 0);

  while (at >= 0) {
    const close = html.indexOf('>', at);

    if (close < 0) {
      return null;
    }

    const opening = html.slice(at, close + 1);

    if (className === undefined || classNames(opening).includes(className)) {
      return { start: at, end: close + 1 };
    }

    at = tagAt(html, tag, close + 1);
  }

  return null;
}

export function extractBlocks(
  html: string,
  tag: string,
  className: string | undefined,
): string[] {
  const blocks: string[] = [];
  const closing = `</${tag}>`;
  let from = 0;

  for (;;) {
    const start = tagAt(html, tag, from);

    if (start < 0) {
      return blocks;
    }

    const close = html.indexOf('>', start);

    if (close < 0) {
      return blocks;
    }

    const opening = html.slice(start, close + 1);

    if (className !== undefined && !classNames(opening).includes(className)) {
      from = close + 1;
      continue;
    }

    const end = html.indexOf(closing, close + 1);

    if (end < 0) {
      return blocks;
    }

    blocks.push(html.slice(start, end + closing.length));
    from = end + closing.length;
  }
}

export function tagWithClass(
  html: string,
  tag: string,
  className: string,
): string | undefined {
  const opening = findOpening(html, tag, className);

  return opening === null ? undefined : html.slice(opening.start, opening.end);
}

export function textWithClass(
  html: string,
  tag: string,
  className: string,
): string | undefined {
  const opening = findOpening(html, tag, className);

  if (opening === null) {
    return undefined;
  }

  const end = html.indexOf(`</${tag}>`, opening.end);

  if (end < 0) {
    return undefined;
  }

  return cleanText(html.slice(opening.end, end));
}

export function attribute(tag: string, name: string): string | undefined {
  const match = tag.match(
    new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i'),
  );
  const value = match?.[1] ?? match?.[2];

  return value !== undefined ? decodeEntities(value) : undefined;
}

export function cleanText(value: string): string {
  return decodeEntities(value.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeEntities(value: string): string {
  return value.replace(
    /&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]+);/g,
    (match, code: string) => {
      if (code.startsWith('#x') || code.startsWith('#X')) {
        const point = Number.parseInt(code.slice(2), 16);
        return isCodePoint(point) ? String.fromCodePoint(point) : match;
      }

      if (code.startsWith('#')) {
        const point = Number.parseInt(code.slice(1), 10);
        return isCodePoint(point) ? String.fromCodePoint(point) : match;
      }

      return ENTITIES[code.toLowerCase()] ?? match;
    },
  );
}

function isCodePoint(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 0x10ffff;
}
