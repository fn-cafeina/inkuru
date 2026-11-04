import { useRef } from 'react';
import type { ScrollViewInstance } from 'react-native';
import { ScrollView } from 'react-native';
import { useScrollToTop } from '@react-navigation/native';

import { EmptyState } from '../../components/EmptyState';
import { PageTitle } from '../../components/PageTitle';
import { Screen } from '../../components/Screen';

export default function SettingsScreen() {
  const scrollRef = useRef<ScrollViewInstance>(null);
  useScrollToTop(scrollRef);

  return (
    <Screen>
      <PageTitle>Ajustes</PageTitle>
      <ScrollView
        ref={scrollRef}
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="flex-1 px-4 pb-6"
      >
        <EmptyState title="Sin ajustes disponibles" />
      </ScrollView>
    </Screen>
  );
}