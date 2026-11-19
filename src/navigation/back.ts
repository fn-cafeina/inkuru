import type { ImperativeRouter } from 'expo-router';

/**
 * Back when the stack has somewhere to go; otherwise land on the library tab,
 * so a deep-linked Manga or Reader route never dead-ends.
 */
export function goBackOrTabs(router: ImperativeRouter) {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace('/');
}
