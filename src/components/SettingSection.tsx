import type { ReactNode } from 'react';
import { View } from 'react-native';

import { SectionTitle } from './SectionTitle';

export function SettingSection({
  title,
  groupRole,
  className,
  children,
}: {
  title: string;
  groupRole?: 'radiogroup';
  className?: string;
  children: ReactNode;
}) {
  return (
    <View className={className ?? 'mt-6'}>
      <SectionTitle className="mb-2">{title}</SectionTitle>
      <View
        accessibilityRole={groupRole}
        className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900"
      >
        {children}
      </View>
    </View>
  );
}
