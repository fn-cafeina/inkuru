/** Every fetch goes to the site's root unless a path is already absolute. */
export const BASE_URL = 'https://zonatmo.org';

/** Relative path of a URL, so a route never carries the host. */
export function toPath(url: string): string {
  return url.replace(/^https?:\/\/[^/]+/i, '');
}

// Android blocks cleartext traffic, so an http source would never load.
export function absoluteUrl(source: string): string {
  if (/^https?:\/\//i.test(source)) {
    return source.replace(/^http:\/\//i, 'https://');
  }

  return `${BASE_URL}${source.startsWith('/') ? '' : '/'}${source}`;
}
