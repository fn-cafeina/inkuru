import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { APP_BAR_GAP, APP_BAR_HEIGHT, SCREEN_PADDING } from '../theme/spacing';

/**
 * Top bar of the tab screens. `action` keeps the optional trailing control in
 * the same 56dp row instead of every screen building its own.
 */
export function PageTitle({
  children,
  action,
}: {
  children: string;
  action?: ReactNode;
}) {
  return (
    <View
      className="flex-row items-center"
      style={{
        height: APP_BAR_HEIGHT,
        paddingHorizontal: SCREEN_PADDING,
        marginBottom: APP_BAR_GAP,
      }}
    >
      <Text
        accessibilityRole="header"
        className="flex-1 text-2xl font-extrabold tracking-tight text-zinc-50"
      >
        {children}
      </Text>
      {action}
    </View>
  );
}
