import Constants from 'expo-constants';
import { File, Paths } from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';

const APK_NAME = 'update.apk';
const APK_MIME = 'application/vnd.android.package-archive';
// Intent.FLAG_GRANT_READ_URI_PERMISSION: the system installer needs read
// access to the content URI, and FileProvider grants nothing without it.
const FLAG_GRANT_READ_URI_PERMISSION = 0x00000001;
// Must match <cache-path name="cached_expo_files"> in expo-file-system's
// file_system_provider_paths.xml, the only cache path the provider serves.
const CACHE_PATH_NAME = 'cached_expo_files';

export async function downloadApk(url: string): Promise<File> {
  const target = new File(Paths.cache, APK_NAME);

  return File.downloadFileAsync(url, target, { idempotent: true });
}

/** Hand the APK to the system installer through the expo-file-system provider. */
export async function installApk(apk: File): Promise<void> {
  const packageName = Constants.expoConfig?.android?.package;

  if (!packageName) {
    throw new Error('android package not configured');
  }

  // Directory URIs may or may not carry a trailing slash; the relative path
  // must start right after it or FileProvider resolves a different file.
  const cacheRoot = Paths.cache.uri.replace(/\/+$/, '');

  if (!apk.uri.startsWith(`${cacheRoot}/`)) {
    throw new Error('apk downloaded outside the cache');
  }

  const relative = apk.uri.slice(cacheRoot.length + 1);

  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    data: `content://${packageName}.FileSystemFileProvider/${CACHE_PATH_NAME}/${relative}`,
    type: APK_MIME,
    flags: FLAG_GRANT_READ_URI_PERMISSION,
  });
}