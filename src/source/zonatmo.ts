import {
  attribute,
  cleanText,
  extractBlocks,
  tagWithClass,
  textWithClass,
} from './html';

const BASE_URL = 'https://zonatmo.org';
const CATALOG_PATH =
  '/biblioteca?order_item=likes_count&order_dir=desc&title=&_pg=1&filter_by=title&author_filter=&type=&demography=shounen&status=';

const STATUS_VALUES: Record<string, string> = {
  publishing: 'Ongoing',
  ongoing: 'Ongoing',
  completed: 'Completed',
  ended: 'Completed',
  hiatus: 'Hiatus',
  cancelled: 'Cancelled',
  canceled: 'Cancelled',
};

export type MangaChapter = {
  title: string;
  path: string;
  date?: string;
};

export type MangaFact = {
  label: string;
  value: string;
};

export type MangaDetail = {
  title: string;
  cover: string;
  tags: string[];
  facts: MangaFact[];
  synopsis: string;
  chapters: MangaChapter[];
};

export type ReaderData = {
  title: string;
  mangaTitle?: string;
  pages: string[];
  chapters: MangaChapter[];
  chapterIndex: number;
  prev?: MangaChapter;
  next?: MangaChapter;
};

export type MangaListItem = {
  title: string;
  cover: string;
  path: string;
  lastChapter?: string;
};

export type CatalogPage = {
  items: MangaListItem[];
  hasMore: boolean;
};

export async function fetchManga(
  path: string,
  signal?: AbortSignal,
): Promise<MangaDetail> {
  return parseManga(await fetchText(path, signal));
}

export async function fetchReader(
  path: string,
  signal?: AbortSignal,
): Promise<ReaderData> {
  return parseReader(await fetchText(path, signal));
}

export async function fetchSearch(
  query: string,
  signal?: AbortSignal,
): Promise<MangaListItem[]> {
  return parseSearch(
    await fetchText(`/api/search/suggest?q=${encodeURIComponent(query)}`, signal),
  );
}

export async function fetchCatalog(
  page: number,
  signal?: AbortSignal,
): Promise<CatalogPage> {
  const path = page > 1 ? `${CATALOG_PATH}&page=${page}` : CATALOG_PATH;

  return parseCatalog(await fetchText(path, signal));
}

async function fetchText(
  path: string,
  signal?: AbortSignal,
): Promise<string> {
  const url = /^https?:\/\//i.test(path)
    ? path
    : `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error(`ZonaTMO respondió HTTP ${response.status}`);
  }

  return response.text();
}

// shortcut: regex tied to zonatmo's detail markup, migrate to an HTML parser when selectors grow.
export function parseManga(html: string): MangaDetail {
  const title = textWithClass(html, 'h1', 'element-title') ?? '';
  const coverTag = html.match(
    /<img\b[^>]*\bclass\s*=\s*"[^"]*\bbook-thumbnail\b[^"]*"[^>]*>/i,
  )?.[0];
  const coverSource = coverTag ? attribute(coverTag, 'src') : undefined;
  const cover = coverSource ? absoluteUrl(coverSource) : undefined;

  if (!title || !cover) {
    throw new Error('Formato inesperado en el detalle de ZonaTMO');
  }

  const tags = extractBlocks(html, 'a', 'badge-primary')
    .map(cleanText)
    .filter((tag) => tag.length > 0);
  const demography =
    textWithClass(html, 'div', 'demography') ??
    textWithClass(html, 'span', 'demography');

  return {
    title,
    cover,
    tags,
    facts: [
      ...fact('Estado', parseMangaStatus(html)),
      ...fact('Tipo', textWithClass(html, 'h1', 'book-type')),
      ...fact('Demografia', demography),
      ...fact('Autor', textWithClass(html, 'span', 'badge-transparent')),
    ],
    synopsis: parseMangaSynopsis(html),
    chapters: extractBlocks(html, 'li', 'upload-link')
      .map(parseMangaChapter)
      .filter(isDefined),
  };
}

// shortcut: regex tied to zonatmo's reader markup, migrate to an HTML parser when selectors grow.
export function parseReader(html: string): ReaderData {
  const pages = (
    html.match(
      /<img\b[^>]*\bclass\s*=\s*"[^"]*\breader-image\b[^"]*"[^>]*>/gi,
    ) ?? []
  )
    .map((tag) => attribute(tag, 'src'))
    .filter(isDefined)
    .map(absoluteUrl);

  if (pages.length === 0) {
    throw new Error('Formato inesperado en el lector de ZonaTMO');
  }

  const selectBlock = html.match(
    /<select[^>]*\bid="chapterSelect"[^>]*>([\s\S]*?)<\/select>/i,
  )?.[1];
  // ZonaTMO lists chapters oldest first; the rest of the app expects newest first.
  const options = selectBlock
    ? extractBlocks(selectBlock, 'option', undefined)
        .map(parseReaderChapter)
        .filter(isDefined)
        .reverse()
    : [];
  const index = options.findIndex((option) => option.selected);
  const current = index >= 0 ? options[index] : undefined;
  const older = index >= 0 ? options[index + 1] : undefined;
  const newer = index >= 0 ? options[index - 1] : undefined;
  const mangaTitle = textWithClass(html, 'a', 'btn-rh');

  return {
    title: current?.title ?? '',
    mangaTitle: mangaTitle || undefined,
    pages,
    chapters: options.map((option) => ({
      title: option.title,
      path: option.path,
    })),
    chapterIndex: index,
    prev: older ? { title: older.title, path: older.path } : undefined,
    next: newer ? { title: newer.title, path: newer.path } : undefined,
  };
}

export function parseSearch(text: string): MangaListItem[] {
  const data: unknown = JSON.parse(text);

  if (!Array.isArray(data)) {
    throw new Error('Formato inesperado en la búsqueda de ZonaTMO');
  }

  return data.map(parseSearchItem).filter(isDefined);
}

// shortcut: regex tied to zonatmo's catalog markup, migrate to an HTML parser when selectors grow.
export function parseCatalog(html: string): CatalogPage {
  if (!/\bid="library-results"/.test(html)) {
    throw new Error('Formato inesperado en el catálogo de ZonaTMO');
  }

  const items = (
    html.match(
      /<a\b[^>]*\bhref\s*=\s*"[^"]*\/library\/[^"]*"[^>]*>[\s\S]*?<\/a>/gi,
    ) ?? []
  )
    .map(parseCatalogItem)
    .filter(isDefined);

  return { items, hasMore: items.length > 0 };
}

function parseCatalogItem(block: string): MangaListItem | undefined {
  const anchor = block.match(/<a\b[^>]*>/i)?.[0];
  const path = anchor ? attribute(anchor, 'href') : undefined;
  const title = textWithClass(block, 'h4', 'text-truncate');
  const cover = extractCover(block);

  if (!title || !path || !cover) {
    return undefined;
  }

  return {
    title,
    cover,
    path: toPath(path),
    lastChapter: textWithClass(block, 'span', 'book-meta-item'),
  };
}

function parseSearchItem(item: unknown): MangaListItem | undefined {
  if (typeof item !== 'object' || item === null) {
    return undefined;
  }

  const value = item as Record<string, unknown>;
  const title = value.title;
  const cover = typeof value.cover === 'string' ? value.cover : value.cover_url;
  const url = value.url;

  if (
    typeof title !== 'string' ||
    typeof cover !== 'string' ||
    typeof url !== 'string'
  ) {
    return undefined;
  }

  const path = toPath(url);

  if (!path.startsWith('/library/')) {
    return undefined;
  }

  return {
    title,
    cover: absoluteUrl(cover),
    path,
  };
}

function parseMangaChapter(block: string): MangaChapter | undefined {
  const pathTag = block.match(
    /<a\b[^>]*\bhref\s*=\s*"[^"]*\/view_uploads\/[^"]*"[^>]*>/i,
  )?.[0];
  const rawPath = pathTag ? attribute(pathTag, 'href') : undefined;
  const title = textWithClass(block, 'span', 'chapter-number');

  if (!title || !rawPath) {
    return undefined;
  }

  return {
    title,
    path: toPath(rawPath),
    date: parseChapterDate(textWithClass(block, 'span', 'text-muted')),
  };
}

type ReaderOption = MangaChapter & { selected: boolean };

function parseReaderChapter(block: string): ReaderOption | undefined {
  const rawPath = attribute(block, 'value');
  const title = cleanText(block);

  if (!rawPath || !title) {
    return undefined;
  }

  return {
    title,
    path: toPath(rawPath),
    selected: /\bselected\b/i.test(block),
  };
}

function parseMangaStatus(html: string): string | undefined {
  const tag = tagWithClass(html, 'span', 'book-status');
  const classes = tag ? attribute(tag, 'class') : undefined;

  for (const name of classes?.split(/\s+/) ?? []) {
    const value = STATUS_VALUES[name];

    if (value) {
      return value;
    }
  }

  return undefined;
}

function parseMangaSynopsis(html: string): string {
  const paragraph = html.match(
    /<p[^>]*\bid="manga-synopsis"[^>]*>([\s\S]*?)<\/p>/i,
  )?.[1];

  return paragraph !== undefined ? cleanText(paragraph) : '';
}

function parseChapterDate(value: string | undefined): string | undefined {
  const match = value ? /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value) : null;
  const day = match?.[1];
  const month = match?.[2];
  const year = match?.[3];

  return day && month && year ? `${year}-${month}-${day}` : value;
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

  return absoluteUrl(source);
}

function fact(label: string, value: string | undefined): MangaFact[] { return value ? [{ label, value }] : []; }
function toPath(url: string): string { return url.replace(/^https?:\/\/[^/]+/i, ''); }
function absoluteUrl(source: string): string {
  return /^https?:\/\//i.test(source)
    ? source
    : `${BASE_URL}${source.startsWith('/') ? '' : '/'}${source}`;
}
function isDefined<T>(value: T | undefined): value is T { return value !== undefined; }
