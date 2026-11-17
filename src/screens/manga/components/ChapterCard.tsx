import { memo } from 'react';
import { Alert, View } from 'react-native';

import { ChapterRow } from '../../../components/ChapterRow';
import {
  cancelDownload,
  deleteDownload,
  enqueueDownload,
  getDownloadState,
} from '../../../downloads/manager';
import type { MangaChapter } from '../../../source/zonatmo';
import type { ChapterState } from '../chapters';
import { ChapterDownloadButton } from './ChapterDownloadButton';

type Props = {
  chapter: MangaChapter;
  state: ChapterState | undefined;
  mangaPath: string;
  mangaTitle: string;
  onOpen: (chapter: MangaChapter) => void;
};

/**
 * One chapter card, memoized so a parent state change (a sort, a focus reload,
 * a progress read) does not re-render the whole mounted list. The download
 * button subscribes to its own chapter, so it still updates on its own.
 */
export const ChapterCard = memo(function ChapterCard({
  chapter,
  state,
  mangaPath,
  mangaTitle,
  onOpen,
}: Props) {
  const handleDownload = () => {
    const status = getDownloadState(chapter.path)?.status;

    if (status === 'done') {
      Alert.alert(
        'Eliminar descarga',
        `Se eliminará ${chapter.title} del dispositivo.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: () => {
              void deleteDownload(chapter.path);
            },
          },
        ],
      );
      return;
    }

    if (status === 'queued' || status === 'downloading') {
      cancelDownload(chapter.path);
      return;
    }

    void enqueueDownload({
      chapterPath: chapter.path,
      chapterTitle: chapter.title,
      mangaPath,
      mangaTitle,
    });
  };

  return (
    <View className="mx-5 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
      <ChapterRow
        title={chapter.title}
        state={state}
        trailing={
          <ChapterDownloadButton
            path={chapter.path}
            title={chapter.title}
            onPress={handleDownload}
          />
        }
        onPress={() => onOpen(chapter)}
      />
    </View>
  );
});
