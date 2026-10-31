import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from './types';

type RootNavigation = NativeStackNavigationProp<RootStackParamList>;

/**
 * Back when the stack has somewhere to go; otherwise land on the tabs, so a
 * deep-linked Manga or Reader screen never dead-ends.
 */
export function goBackOrTabs(navigation: RootNavigation) {
  if (navigation.canGoBack()) {
    navigation.goBack();
    return;
  }

  navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] });
}
