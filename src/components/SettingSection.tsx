import type { ReactNode } from 'react';
import { View } from 'react-native';

import { SectionTitle } from './SectionTitle';

export function SettingSection({
  title,
  groupRole,
  children,
}: {
  title: string;
  groupRole?: 'radiogroup';
  children: ReactNode;
}) {
  return (
    <View className="mt-6">
      <SectionTitle className="mb-2 px-1">{title}</SectionTitle>
      <View
        accessibilityRole={groupRole}
        className="overflow-hidden rounded-2xl bg-white dark:bg-zinc-900"
      >
        {children}
      </View>
    </View>
  );
}
