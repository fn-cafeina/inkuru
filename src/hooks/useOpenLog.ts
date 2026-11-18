import { useEffect, useRef } from 'react';

import type { Fields } from '../dev/log';
import { log, ms } from '../dev/log';

/**
 * One info line the first time `fields` is not null for a given `key`: how long
 * the screen took to have something to show, plus the numbers that explain it.
 * The http, parse and cache lines say where the time went; this is the total a
 * user feels.
 *
 * `key` is what the wait belongs to (a manga path, a chapter path), so a reader
 * that switches chapters logs each open instead of only the first.
 */
export function useOpenLog(
  tag: string,
  key: string,
  fields: Fields | null,
): void {
  const keyRef = useRef<string | null>(null);
  const startedAt = useRef(0);
  const logged = useRef(false);

  useEffect(() => {
    if (keyRef.current === key) {
      return;
    }

    keyRef.current = key;
    startedAt.current = performance.now();
    logged.current = false;
  }, [key]);

  useEffect(() => {
    if (fields === null || logged.current || keyRef.current !== key) {
      return;
    }

    logged.current = true;
    log.info(tag, 'open', { ms: ms(startedAt.current), ...fields });
  }, [fields, key, tag]);
}
