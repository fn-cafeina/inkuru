/**
 * Dev logger: one line per event worth reading, with the numbers next to it.
 *
 * Level guide, borrowed from rokimu: debug is the per-request flow (http, parse,
 * cache, fetch), info is a decision the user feels (a manga or chapter took
 * this long), warn is degraded but recovering, error is a failure.
 *
 * Release builds keep warn and error so a field report still says what broke.
 * `__DEV__` is stripped there, so the debug and info lines cost nothing.
 */
export type Level = 'debug' | 'info' | 'warn' | 'error';

export type Fields = Record<
  string,
  string | number | boolean | undefined | null
>;

const IS_DEV = (globalThis as { __DEV__?: boolean }).__DEV__ === true;
const LEVEL_RANK: Record<Level, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let minRank = LEVEL_RANK[IS_DEV ? 'debug' : 'warn'];

/** Silence or widen the output, for one session of chasing a bug. */
export function setLogLevel(level: Level): void {
  minRank = LEVEL_RANK[level];
}

function pad(value: number, width = 2): string {
  return String(value).padStart(width, '0');
}

function timestamp(): string {
  const now = new Date();

  return (
    `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}` +
    `.${pad(now.getMilliseconds(), 3)}`
  );
}

function quote(value: string): string {
  return /[\s"]/.test(value) ? JSON.stringify(value) : value;
}

/** `key=value` pairs after the message, so the line stays greppable. */
function formatFields(fields?: Fields): string {
  if (!fields) {
    return '';
  }

  return Object.entries(fields)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => ` ${key}=${typeof value === 'string' ? quote(value) : String(value)}`)
    .join('');
}

function write(
  level: Level,
  tag: string,
  message: string,
  fields?: Fields,
): void {
  if (LEVEL_RANK[level] < minRank) {
    return;
  }

  const line = `[${timestamp()}] [${level.toUpperCase()}] [${tag}] ${message}${formatFields(fields)}`;

  if (level === 'warn') {
    console.warn(line);
  } else if (level === 'error') {
    console.error(line);
  } else {
    console.log(line);
  }
}

export const log = {
  debug: (tag: string, message: string, fields?: Fields) =>
    write('debug', tag, message, fields),
  info: (tag: string, message: string, fields?: Fields) =>
    write('info', tag, message, fields),
  warn: (tag: string, message: string, fields?: Fields) =>
    write('warn', tag, message, fields),
  error: (tag: string, message: string, fields?: Fields) =>
    write('error', tag, message, fields),
};

/** Milliseconds since `startedAt`, for the `ms=` field. */
export function ms(startedAt: number): number {
  return Math.round(performance.now() - startedAt);
}

/** Whole seconds of an age in ms, for `age=`. 12s reads better than 12000. */
export function seconds(value: number): string {
  return `${Math.round(value / 1000)}s`;
}

/** The error message only: a stack in the fields would bury the line. */
export function reason(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
