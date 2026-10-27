import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type {
  CompositeNavigationProp,
  NavigatorScreenParams,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type HomeTabsParamList = {
  Home: undefined;
  Search: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<HomeTabsParamList> | undefined;
  Manga: { path: string; title?: string };
  Reader: { path: string; title: string };
};

export type TabNavigation<RouteName extends keyof HomeTabsParamList> =
  CompositeNavigationProp<
    BottomTabNavigationProp<HomeTabsParamList, RouteName>,
    NativeStackNavigationProp<RootStackParamList>
  >;
