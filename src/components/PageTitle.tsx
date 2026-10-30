import { Text, View } from 'react-native';

import { APP_BAR_GAP, APP_BAR_HEIGHT, SCREEN_PADDING } from '../theme/spacing';

export function PageTitle({ children }: { children: string }) {
  return (
    <View
      className="justify-center"
      style={{
        height: APP_BAR_HEIGHT,
        paddingHorizontal: SCREEN_PADDING,
        marginBottom: APP_BAR_GAP,
      }}
    >
      <Text
        accessibilityRole="header"
        className="text-xl font-semibold text-zinc-900 dark:text-zinc-50"
      >
        {children}
      </Text>
    </View>
  );
}
