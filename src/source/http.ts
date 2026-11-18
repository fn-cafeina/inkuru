import { log, ms } from '../dev/log';
import { absoluteUrl } from './url';

/**
 * The site's only transport. Read here once so a slow page or a bad status
 * shows up in the log next to the parse that follows it.
 */
export async function fetchText(
  path: string,
  signal?: AbortSignal,
): Promise<string> {
  // expo/fetch reads the body in native code. The global fetch is whatwg-fetch
  // over XHR, which rebuilds the whole string on every 8KB chunk because a
  // signal puts the request in incremental mode: a 2MB manga page blocks the
  // JS thread for seconds and every tap queues behind it. Imported lazily so
  // the parser self-checks stay free of React Native.
  const { fetch: nativeFetch } = await import('expo/fetch');
  const startedAt = performance.now();
  const response = await nativeFetch(absoluteUrl(path), { signal });

  if (!response.ok) {
    log.warn('http', path, {
      status: response.status,
      ms: ms(startedAt),
    });
    throw new Error(`ZonaTMO returned HTTP ${response.status}`);
  }

  const text = await response.text();

  log.debug('http', path, {
    status: response.status,
    kb: Math.round(text.length / 1024),
    ms: ms(startedAt),
  });

  return text;
}
