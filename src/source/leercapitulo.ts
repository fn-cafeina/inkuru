const BASE_URL = 'https://www.leercapitulo.co';

const ENTITIES: Record<string, string> = {
  amp: '&',
  apos: "'",
  gt: '>',
  hellip: '…',
  laquo: '«',
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

export type HomeChapter = {
  title: string;
  path: string;
  time?: string;
};

export type HomeManga = {
  title: string;
  path: string;
  cover: string;
};

export type HomeTrending = HomeManga & {
  latestChapter?: HomeChapter;
};

export type HomeRelease = HomeManga & {
  chapters: HomeChapter[];
};

export type HomeSideItem = HomeManga & {
  lastChapter: string;
};

export type HomeData = {
  trending: HomeTrending[];
  releases: HomeRelease[];
  popular: HomeSideItem[];
  latest: HomeSideItem[];
};

export async function fetchHome(signal?: AbortSignal): Promise<HomeData> {
  const response = await fetch(`${BASE_URL}/`, { signal });

  if (!response.ok) {
    throw new Error(`LeerCapitulo respondió HTTP ${response.status}`);
  }

  return parseHome(await response.text());
}

// shortcut: regex tied to leercapitulo's home markup, migrate to an HTML parser when selectors grow.
export function parseHome(html: string): HomeData {
  const trending = extractBlocks(html, 'div', 'lc-slide')
    .map(parseTrending)
    .filter(isDefined);
  const releases = extractBlocks(html, 'article', 'lc-release')
    .map(parseRelease)
    .filter(isDefined);
  const panels = extractBlocks(html, 'section', 'lc-panel');

  if (trending.length === 0 || releases.length === 0) {
    throw new Error('Formato inesperado en el inicio de LeerCapitulo');
  }

  return {
    trending,
    releases,
    popular: parseSidePanel(panels, 'populares'),
    latest: parseSidePanel(panels, 'ultimos mangas'),
  };
}

function parseTrending(block: string): HomeTrending | undefined {
  const coverTag = tagWithClass(block, 'a', 'lc-slide-cover');
  const chapterTag = tagWithClass(block, 'a', 'lc-slide-chapter');
  const cover = extractCover(block);
  const path = coverTag ? attribute(coverTag, 'href') : undefined;
  const title = textWithClass(block, 'a', 'lc-slide-name');

  if (!title || !path || !cover) {
    return undefined;
  }

  const chapterTitle = textWithClass(block, 'a', 'lc-slide-chapter');
  const chapterPath = chapterTag ? attribute(chapterTag, 'href') : undefined;

  return {
    title,
    path,
    cover,
    latestChapter:
      chapterTitle && chapterPath
        ? { title: chapterTitle, path: chapterPath }
        : undefined,
  };
}

function parseRelease(block: string): HomeRelease | undefined {
  const coverTag = tagWithClass(block, 'a', 'lc-release-cover');
  const titleTag = tagWithClass(block, 'a', 'lc-release-title');
  const cover = extractCover(block);
  const path =
    (coverTag ? attribute(coverTag, 'href') : undefined) ??
    (titleTag ? attribute(titleTag, 'href') : undefined);
  const title = textWithClass(block, 'a', 'lc-release-title');

  if (!title || !path || !cover) {
    return undefined;
  }

  const chapters = extractBlocks(block, 'li', undefined)
    .map(parseChapter)
    .filter(isDefined);

  return { title, path, cover, chapters };
}

function parseChapter(block: string): HomeChapter | undefined {
  const linkTag = tagWithClass(block, 'a', 'lc-chapter-link');
  const title = textWithClass(block, 'a', 'lc-chapter-link');
  const path = linkTag ? attribute(linkTag, 'href') : undefined;

  if (!title || !path) {
    return undefined;
  }

  return {
    title,
    path,
    time: textWithClass(block, 'span', 'lc-chapter-time'),
  };
}

function parseSidePanel(panels: string[], titleStart: string): HomeSideItem[] {
  const panel = panels.find((candidate) => {
    const title = textWithClass(candidate, 'h2', 'lc-panel-title');
    return title?.toLowerCase().startsWith(titleStart) ?? false;
  });

  if (!panel) {
    return [];
  }

  return extractBlocks(panel, 'a', 'lc-side-item')
    .map(parseSideItem)
    .filter(isDefined);
}

function parseSideItem(block: string): HomeSideItem | undefined {
  const cover = extractCover(block);
  const path = attribute(block, 'href');
  const title = textWithClass(block, 'span', 'lc-side-name');
  const lastChapter = textWithClass(block, 'span', 'lc-side-chapter');

  if (!title || !path || !cover || !lastChapter) {
    return undefined;
  }

  return { title, path, cover, lastChapter };
}

function extractBlocks(
  html: string,
  tag: string,
  className: string | undefined,
): string[] {
  const opening = className
    ? `<${tag}\\b[^>]*\\bclass\\s*=\\s*"[^"]*\\b${className}\\b[^"]*"[^>]*>`
    : `<${tag}\\b[^>]*>`;
  const pattern = new RegExp(`${opening}[\\s\\S]*?</${tag}>`, 'gi');

  return html.match(pattern) ?? [];
}

function tagWithClass(
  html: string,
  tag: string,
  className: string,
): string | undefined {
  const pattern = new RegExp(
    `<${tag}\\b[^>]*\\bclass\\s*=\\s*"[^"]*\\b${className}\\b[^"]*"[^>]*>`,
    'i',
  );

  return html.match(pattern)?.[0];
}

function textWithClass(
  html: string,
  tag: string,
  className: string,
): string | undefined {
  const pattern = new RegExp(
    `<${tag}\\b[^>]*\\bclass\\s*=\\s*"[^"]*\\b${className}\\b[^"]*"[^>]*>([\\s\\S]*?)</${tag}>`,
    'i',
  );
  const match = html.match(pattern);

  return match ? cleanText(match[1]) : undefined;
}

function attribute(tag: string, name: string): string | undefined {
  const match = tag.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*"([^"]*)"`, 'i'));

  return match ? decodeEntities(match[1]) : undefined;
}

function extractCover(block: string): string | undefined {
  const imageTag = block.match(/<img\b[^>]*>/i)?.[0];

  if (!imageTag) {
    return undefined;
  }

  const source = attribute(imageTag, 'src');

  if (!source) {
    return undefined;
  }

  return /^https?:\/\//i.test(source) ? source : `${BASE_URL}${source}`;
}

function cleanText(value: string): string {
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

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}
