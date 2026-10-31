import type {
  CatalogPage,
  MangaChapter,
  MangaDetail,
  MangaFact,
  MangaListItem,
  ReaderData,
} from './zonatmo';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string';
}

function isMangaChapter(value: unknown): value is MangaChapter {
  if (!isRecord(value)) {
    return false;
  }

  return isString(value.title) && isString(value.path);
}

function isMangaListItem(value: unknown): value is MangaListItem {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.title) &&
    isString(value.cover) &&
    isString(value.path) &&
    isOptionalString(value.lastChapter)
  );
}

function isMangaFact(value: unknown): value is MangaFact {
  return (
    isRecord(value) && isString(value.label) && isString(value.value)
  );
}

export function isCatalogPage(value: unknown): value is CatalogPage {
  if (!isRecord(value)) {
    return false;
  }

  return (
    Array.isArray(value.items) &&
    value.items.every(isMangaListItem) &&
    typeof value.hasMore === 'boolean'
  );
}

export function isMangaDetail(value: unknown): value is MangaDetail {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.title) &&
    isString(value.cover) &&
    isString(value.synopsis) &&
    Array.isArray(value.tags) &&
    value.tags.every(isString) &&
    Array.isArray(value.facts) &&
    value.facts.every(isMangaFact) &&
    Array.isArray(value.chapters) &&
    value.chapters.every(isMangaChapter)
  );
}

export function isReaderData(value: unknown): value is ReaderData {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.title) &&
    isOptionalString(value.mangaTitle) &&
    Array.isArray(value.pages) &&
    value.pages.every(isString) &&
    Array.isArray(value.chapters) &&
    value.chapters.every(isMangaChapter) &&
    typeof value.chapterIndex === 'number' &&
    Number.isFinite(value.chapterIndex) &&
    (value.prev === undefined || isMangaChapter(value.prev)) &&
    (value.next === undefined || isMangaChapter(value.next))
  );
}
