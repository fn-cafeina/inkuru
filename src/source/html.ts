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

// Matches a class attribute in either quote style.
function classAttr(className: string): string {
  return `\\bclass\\s*=\\s*(?:"[^"]*\\b${className}\\b[^"]*"|'[^']*\\b${className}\\b[^']*')`;
}

export function extractBlocks(
  html: string,
  tag: string,
  className: string | undefined,
): string[] {
  const opening = className
    ? `<${tag}\\b[^>]*${classAttr(className)}[^>]*>`
    : `<${tag}\\b[^>]*>`;
  const pattern = new RegExp(`${opening}[\\s\\S]*?</${tag}>`, 'gi');

  return html.match(pattern) ?? [];
}

export function tagWithClass(
  html: string,
  tag: string,
  className: string,
): string | undefined {
  const pattern = new RegExp(`<${tag}\\b[^>]*${classAttr(className)}[^>]*>`, 'i');

  return html.match(pattern)?.[0];
}

export function textWithClass(
  html: string,
  tag: string,
  className: string,
): string | undefined {
  const pattern = new RegExp(
    `<${tag}\\b[^>]*${classAttr(className)}[^>]*>([\\s\\S]*?)</${tag}>`,
    'i',
  );
  const match = html.match(pattern);
  const text = match?.[1];

  return text !== undefined ? cleanText(text) : undefined;
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
