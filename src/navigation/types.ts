import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type {
  CompositeNavigationProp,
  NavigatorScreenParams,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type MainTabsParamList = {
  Home: undefined;
  Search: undefined;
  Discover: undefined;
  Library: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<MainTabsParamList> | undefined;
  Manga: { path: string; title?: string };
  Reader: { path: string; title: string; mangaPath?: string };
};

export type TabNavigation<RouteName extends keyof MainTabsParamList> =
  CompositeNavigationProp<
    BottomTabNavigationProp<MainTabsParamList, RouteName>,
    NativeStackNavigationProp<RootStackParamList>
  >;
