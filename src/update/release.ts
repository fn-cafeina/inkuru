export type LatestRelease = {
  tag: string;
  apkUrl: string;
};

/**
 * The GitHub API allows 60 unauthenticated requests per hour and does not
 * count conditional requests answered with 304, so a six-hour window keeps a
 * shared home network well below the limit even without the ETag.
 */
export const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

/** Extract the installable APK from a GitHub release payload. */
export function parseRelease(raw: unknown): LatestRelease | null {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const tag = record.tag_name;
  const assets = record.assets;

  if (typeof tag !== 'string' || tag === '' || !Array.isArray(assets)) {
    return null;
  }

  for (const asset of assets) {
    if (typeof asset !== 'object' || asset === null) {
      continue;
    }

    const entry = asset as Record<string, unknown>;

    if (
      typeof entry.name === 'string' &&
      entry.name.endsWith('.apk') &&
      typeof entry.browser_download_url === 'string'
    ) {
      return { tag, apkUrl: entry.browser_download_url };
    }
  }

  return null;
}

/** True when `tag` (v1.2.3) is a higher release than the installed version. */
export function isNewerVersion(tag: string, current: string): boolean {
  const remote = versionSegments(tag);
  const installed = versionSegments(current);

  if (remote === null || installed === null) {
    return false;
  }

  const length = Math.max(remote.length, installed.length);

  for (let index = 0; index < length; index += 1) {
    const remoteSegment = remote[index] ?? 0;
    const installedSegment = installed[index] ?? 0;

    if (remoteSegment !== installedSegment) {
      return remoteSegment > installedSegment;
    }
  }

  return false;
}

/** Whether the throttle window has elapsed since the last API round trip. */
export function shouldCheck(checkedAt: number | null, now: number): boolean {
  return checkedAt === null || now - checkedAt >= CHECK_INTERVAL_MS;
}

/** Numeric segments of a `v1.2.3` tag, or null when it is not comparable. */
function versionSegments(value: string): number[] | null {
  const parts = value.trim().replace(/^v/i, '').split('.');

  if (parts.some((part) => part === '' || !/^\d+$/.test(part))) {
    return null;
  }

  return parts.map((part) => Number(part));
}