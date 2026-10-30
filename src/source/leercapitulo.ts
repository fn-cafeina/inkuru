import {
  attribute,
  cleanText,
  extractBlocks,
  tagWithClass,
  textWithClass,
} from './html';

const BASE_URL = 'https://www.leercapitulo.co';

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
    await fetchText(`/search/?q=${encodeURIComponent(query)}`, signal),
  );
}

export async function fetchCatalog(
  page: number,
  signal?: AbortSignal,
): Promise<CatalogPage> {
  const path = page > 1 ? `/manga/?page=${page}` : '/manga/';

  return parseCatalog(await fetchText(path, signal));
}

async function fetchText(
  path: string,
  signal?: AbortSignal,
): Promise<string> {
  const url = path.startsWith('/') ? `${BASE_URL}${path}` : `${BASE_URL}/${path}`;
  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error(`LeerCapitulo respondió HTTP ${response.status}`);
  }

  return response.text();
}

// shortcut: regex tied to leercapitulo's detail markup, migrate to an HTML parser when selectors grow.
export function parseManga(html: string): MangaDetail {
  const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const titleHtml = titleMatch?.[1];
  const title = titleHtml !== undefined ? cleanText(titleHtml) : '';
  const coverBlock = extractBlocks(html, 'div', 'lc-cover-lg')[0];
  const cover = coverBlock ? extractCover(coverBlock) : undefined;

  if (!title || !cover) {
    throw new Error('Formato inesperado en el detalle de LeerCapitulo');
  }

  const tags = [
    ...extractBlocks(html, 'a', 'text-bg-secondary'),
    ...extractBlocks(html, 'a', 'text-bg-light'),
  ]
    .map(cleanText)
    .filter((tag) => tag.length > 0);

  const factsBlock = extractBlocks(html, 'ul', 'lc-facts')[0];
  const facts = factsBlock
    ? extractBlocks(factsBlock, 'li', undefined)
        .map(parseMangaFact)
        .filter(isDefined)
    : [];

  return {
    title,
    cover,
    tags,
    facts,
    synopsis: parseMangaSynopsis(html),
    chapters: extractBlocks(html, 'a', 'lc-chapter-row')
      .map(parseMangaChapter)
      .filter(isDefined),
  };
}

// shortcut: regex tied to leercapitulo's reader markup, migrate to an HTML parser when selectors grow.
export function parseReader(html: string): ReaderData {
  const pagesBlock = extractBlocks(html, 'main', 'lc-pages')[0];
  const pages = pagesBlock
    ? (pagesBlock.match(/<img\b[^>]*>/gi) ?? [])
        .map((tag) => attribute(tag, 'data-src') ?? attribute(tag, 'src'))
        .filter(isDefined)
        .map(absoluteUrl)
    : [];

  if (pages.length === 0) {
    throw new Error('Formato inesperado en el lector de LeerCapitulo');
  }

  const selectBlock = html.match(
    /<select[^>]*\bid="chapterSelect"[^>]*>([\s\S]*?)<\/select>/i,
  )?.[1];
  const options = selectBlock
    ? extractBlocks(selectBlock, 'option', undefined)
        .map(parseReaderChapter)
        .filter(isDefined)
    : [];
  const index = options.findIndex((option) => option.selected);
  const current = index >= 0 ? options[index] : undefined;
  const older = index >= 0 ? options[index + 1] : undefined;
  const newer = index >= 0 ? options[index - 1] : undefined;
  const mangaTitle = textWithClass(html, 'a', 'lc-rbtn--title')?.replace(
    /^[^\p{L}\p{N}]+/u,
    '',
  );

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
    throw new Error('Formato inesperado en la búsqueda de LeerCapitulo');
  }

  return data.map(parseSearchItem).filter(isDefined);
}

// shortcut: regex tied to leercapitulo's catalog markup, migrate to an HTML parser when selectors grow.
export function parseCatalog(html: string): CatalogPage {
  if (!/\bdata-filter-form\b/.test(html)) {
    throw new Error('Formato inesperado en el catálogo de LeerCapitulo');
  }

  return {
    items: extractBlocks(html, 'article', 'lc-card')
      .map(parseCatalogItem)
      .filter(isDefined),
    hasMore: /<a\b[^>]*\brel="next"/i.test(html),
  };
}

function parseCatalogItem(block: string): MangaListItem | undefined {
  const nameTag = tagWithClass(block, 'a', 'lc-card-name');
  const title = textWithClass(block, 'a', 'lc-card-name');
  const path = nameTag ? attribute(nameTag, 'href') : undefined;
  const cover = extractCover(block);

  if (!title || !path || !cover) {
    return undefined;
  }

  return {
    title,
    cover,
    path,
    lastChapter: textWithClass(block, 'a', 'lc-chapter-link'),
  };
}

function parseSearchItem(item: unknown): MangaListItem | undefined {
  if (typeof item !== 'object' || item === null) {
    return undefined;
  }

  const value = item as Record<string, unknown>;
  const title = value.name;
  const cover = value.cover_uri;
  const path = value.uri;
  const lastChapter = value.last_chapter_name;

  if (
    typeof title !== 'string' ||
    typeof cover !== 'string' ||
    typeof path !== 'string'
  ) {
    return undefined;
  }

  return {
    title,
    cover: absoluteUrl(cover),
    path,
    lastChapter: typeof lastChapter === 'string' ? lastChapter : undefined,
  };
}

function parseMangaFact(block: string): MangaFact | undefined {
  const label = textWithClass(block, 'span', 'k');
  const valueMatch = block.match(
    /<span[^>]*\bclass\s*=\s*"[^"]*\bk\b[^"]*"[^>]*>[\s\S]*?<\/span>([\s\S]*)<\/li>/i,
  );
  const valueHtml = valueMatch?.[1];
  const value = valueHtml !== undefined ? cleanText(valueHtml) : undefined;

  if (!label || !value) {
    return undefined;
  }

  return { label, value };
}

function parseMangaChapter(block: string): MangaChapter | undefined {
  const path = attribute(block, 'href');
  const title = textWithClass(block, 'span', 'n');

  if (!title || !path) {
    return undefined;
  }

  return {
    title,
    path,
    date: textWithClass(block, 'span', 'd'),
  };
}

type ReaderOption = MangaChapter & { selected: boolean };

function parseReaderChapter(block: string): ReaderOption | undefined {
  const path = attribute(block, 'value');
  const title = cleanText(block);

  if (!path || !title) {
    return undefined;
  }

  return {
    title,
    path,
    selected: /\bselected\b/i.test(block),
  };
}

function parseMangaSynopsis(html: string): string {
  const section = html.match(
    /<section[^>]*\bid="sinopsis"[^>]*>([\s\S]*?)<\/section>/i,
  )?.[1];
  const paragraph = section?.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1];

  return paragraph ? cleanText(paragraph) : '';
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

function absoluteUrl(source: string): string {
  return /^https?:\/\//i.test(source) ? source : `${BASE_URL}${source}`;
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}
