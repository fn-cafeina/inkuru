import { log, ms, reason, seconds, setLogLevel } from './log';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

type Level = 'log' | 'warn' | 'error';

const printed: { level: Level; line: string }[] = [];
const realConsole = { log: console.log, warn: console.warn, error: console.error };

function capture(): void {
  for (const level of ['log', 'warn', 'error'] as const) {
    console[level] = (line: string) => {
      printed.push({ level, line });
    };
  }
}

function release(): void {
  console.log = realConsole.log;
  console.warn = realConsole.warn;
  console.error = realConsole.error;
}

function last(): { level: Level; line: string } {
  const entry = printed[printed.length - 1];

  if (entry === undefined) {
    throw new Error('nothing was logged');
  }

  return entry;
}

capture();
// The default level is warn outside the app, so tests ask for everything.
setLogLevel('debug');

log.debug('http', '/library/manga/1/a', {
  status: 200,
  bytes: 1024,
  ms: 850,
});
assert(last().level === 'log', 'debug goes to log');
assert(
  last().line.includes('[DEBUG] [http] /library/manga/1/a'),
  `tag and message: ${last().line}`,
);
assert(
  last().line.includes('status=200 bytes=1024 ms=850'),
  `numbers stay unquoted: ${last().line}`,
);
assert(
  /^\[\d{2}:\d{2}:\d{2}\.\d{3}\]/.test(last().line),
  `the line starts with a timestamp: ${last().line}`,
);

log.info('manga', 'open', { related: 9 });
assert(last().level === 'log', 'info goes to log');

log.warn('fetch', 'manga:/x', { reason: 'boom' });
assert(last().level === 'warn', 'warn goes to warn');

log.debug('http', '/x', { note: 'two words' });
assert(
  last().line.includes('note="two words"'),
  `a value with spaces is quoted: ${last().line}`,
);

log.debug('http', '/x', { skipped: undefined, ok: true });
assert(
  !last().line.includes('skipped'),
  `an undefined field is dropped: ${last().line}`,
);
assert(last().line.includes('ok=true'), 'a boolean field is kept');

setLogLevel('warn');
log.debug('http', '/silent', {});
log.info('manga', 'open', {});
assert(last().line.includes('/x'), 'debug and info are gated at warn');
log.warn('fetch', '/still-there', {});
assert(last().line.includes('/still-there'), 'warn survives the gate');
setLogLevel('debug');

log.error('cache', '/broken', { reason: 'json' });
assert(last().level === 'error', 'error goes to error');
assert(
  last().line.includes('[ERROR] [cache] /broken reason=json'),
  `error line: ${last().line}`,
);

release();

assert(ms(performance.now() - 12) >= 12, 'ms reads the elapsed time');
assert(seconds(12_000) === '12s', 'seconds rounds to whole seconds');
assert(seconds(1_400) === '1s', 'seconds rounds down');
assert(
  reason(new Error('boom')) === 'boom',
  'reason keeps only the error message',
);
assert(reason('text') === 'text', 'reason accepts a non-error');
assert(reason(undefined) === 'undefined', 'reason stringifies the rest');

console.log('debug log ok');
