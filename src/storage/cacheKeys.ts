export const readerCacheKey = (chapterPath: string) =>
  `reader:${chapterPath}`;

export const discoverCacheKey = (term: string, page: number) =>
  `discover:${term}:${page}`;
