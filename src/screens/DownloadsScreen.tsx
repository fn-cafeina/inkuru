import { useRef } from 'react';
import { FlatList, Text } from 'react-native';
import { useNavigation, useScrollToTop } from '@react-navigation/native';

import { AppPressable } from '../components/AppPressable';
import { EmptyState } from '../components/EmptyState';
import { ListDivider } from '../components/ListDivider';
import { PageTitle } from '../components/PageTitle';
import { Screen } from '../components/Screen';
import type { DownloadRecord } from '../downloads/types';
import { useDownloadRecords } from '../hooks/useDownloads';
import type { TabNavigation } from '../navigation/types';

export default function DownloadsScreen() {
  const navigation = useNavigation<TabNavigation<'Downloads'>>();
  const records = useDownloadRecords();
  const listRef = useRef<FlatList<DownloadRecord>>(null);

  useScrollToTop(listRef);

  return (
    <Screen>
      <PageTitle>Descargas</PageTitle>

      {records.length === 0 ? (
        <EmptyState
          title="Sin descargas"
          subtitle="Descarga un capítulo desde su manga para leerlo sin conexión."
        />
      ) : (
        <FlatList
          ref={listRef}
          data={records}
          keyExtractor={(record) => record.chapterPath}
          ItemSeparatorComponent={ListDivider}
          contentContainerClassName="pb-6"
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <AppPressable
              accessibilityLabel={`${item.mangaTitle}, ${item.chapterTitle}`}
              onPress={() =>
                navigation.navigate('Reader', {
                  path: item.chapterPath,
                  title: item.chapterTitle,
                  mangaPath: item.mangaPath,
                })
              }
              className="min-h-14 justify-center px-4 py-2"
            >
              <Text
                numberOfLines={1}
                className="text-sm text-zinc-900 dark:text-zinc-100"
              >
                {item.chapterTitle}
              </Text>
              <Text
                numberOfLines={1}
                className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400"
              >
                {item.mangaTitle}
              </Text>
            </AppPressable>
          )}
        />
      )}
    </Screen>
  );
}
