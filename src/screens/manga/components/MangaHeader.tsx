import { useRef, useState } from 'react';
import { Image, ScrollView, Text, View } from 'react-native';
import type { ScrollViewInstance } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { AppPressable } from '../../../components/AppPressable';
import { Button } from '../../../components/Button';
import { OptionChip } from '../../../components/OptionChip';
import { SectionTitle } from '../../../components/SectionTitle';
import type { MangaChapter, MangaDetail } from '../../../source/leercapitulo';
import { COVER_ASPECT_RATIO } from '../../../theme/layout';
import { MANGA_COVER_WIDTH } from '../../../theme/spacing';
import { useColors } from '../../../theme/colors';
import type { ChapterRange } from '../chapters';
import { TagRow } from './TagRow';

const FACT_VALUES: Record<string, string> = {
  Ongoing: 'En emisión',
  Completed: 'Completa',
  Cancelled: 'Cancelada',
  Canceled: 'Cancelada',
  Hiatus: 'En pausa',
};

type Props = {
  manga: MangaDetail;
  readCount: number;
  resumeChapter?: MangaChapter;
  sortOrder: 'asc' | 'desc';
  ranges: ChapterRange[];
  activeRange: number;
  onSelectRange: (index: number) => void;
  onToggleSort: () => void;
  onRead: (chapter: MangaChapter) => void;
  ready: boolean;
};

export function MangaHeader({
  manga,
  readCount,
  resumeChapter,
  sortOrder,
  ranges,
  activeRange,
  onSelectRange,
  onToggleSort,
  onRead,
  ready,
}: Props) {
  const colors = useColors();
  const chipRowRef = useRef<ScrollViewInstance>(null);
  const factValue = (label: string) => {
    const value = manga.facts.find((fact) => fact.label === label)?.value;

    return value ? FACT_VALUES[value] ?? value : undefined;
  };
  const firstChapter = manga.chapters[manga.chapters.length - 1];
  const readChapter = resumeChapter ?? firstChapter;

  return (
    <View>
      <MangaCoverInfo
        manga={manga}
        status={factValue('Estado')}
        author={factValue('Autor')}
        updated={factValue('Actualizado')}
      />

      {readChapter ? (
        <View className="mt-4 px-4">
          <Button
            variant="primary"
            size="lg"
            disabled={!ready}
            onPress={() => onRead(readChapter)}
          >
            {resumeChapter
              ? `Continuar ${resumeChapter.title}`
              : 'Leer primer capítulo'}
          </Button>
        </View>
      ) : null}

      {readCount > 0 ? (
        <MangaProgress readCount={readCount} total={manga.chapters.length} />
      ) : null}

      {manga.tags.length > 0 ? (
        <View className="mt-4 px-4">
          <TagRow tags={manga.tags} />
        </View>
      ) : null}

      {manga.synopsis ? <MangaSynopsis synopsis={manga.synopsis} /> : null}

      <View className="mt-6 px-4">
        {ranges.length > 1 ? (
          <>
            <SectionTitle className="mb-2">Rangos</SectionTitle>
            <View
              accessibilityRole="radiogroup"
              accessibilityLabel="Rangos de capítulos"
            >
              <ScrollView
                ref={chipRowRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                // Keep the last range visible when it becomes selected.
                onContentSizeChange={() => {
                  if (ranges.length > 0 && activeRange === ranges.length - 1) {
                    chipRowRef.current?.scrollToEnd({ animated: false });
                  }
                }}
                contentContainerClassName="gap-2 pb-3"
              >
                {ranges.map((range, index) => (
                  <OptionChip
                    key={`${range.label}-${index}`}
                    label={range.label}
                    accessibilityLabel={`Capítulos ${range.label.replace('-', ' a ')}`}
                    selected={index === activeRange}
                    onPress={() => onSelectRange(index)}
                  />
                ))}
              </ScrollView>
            </View>
          </>
        ) : null}
        <View className="flex-row items-center">
          <View className="flex-1 flex-row items-center gap-2">
            <SectionTitle>Capítulos</SectionTitle>
            <Text className="text-xs text-zinc-500 dark:text-zinc-400">
              {manga.chapters.length}
            </Text>
          </View>
          <AppPressable
            accessibilityLabel={
              sortOrder === 'asc'
                ? 'Ordenar capítulos: más recientes primero'
                : 'Ordenar capítulos: más antiguos primero'
            }
            accessibilityHint="Toca para invertir el orden"
            hitSlop={4}
            onPress={onToggleSort}
            className="min-h-12 min-w-12 items-center justify-center rounded-full"
          >
            <Feather
              name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'}
              size={18}
              color={colors.text}
            />
          </AppPressable>
        </View>
      </View>
    </View>
  );
}

function MangaCoverInfo({
  manga,
  status,
  author,
  updated,
}: {
  manga: MangaDetail;
  status?: string;
  author?: string;
  updated?: string;
}) {
  const colors = useColors();

  return (
    <View className="flex-row px-4">
      <View
        className="overflow-hidden rounded-xl bg-zinc-200 dark:bg-zinc-800"
        style={{ width: MANGA_COVER_WIDTH, aspectRatio: COVER_ASPECT_RATIO }}
      >
        <Image
          source={{ uri: manga.cover }}
          className="h-full w-full"
          resizeMode="cover"
          accessible={false}
        />
      </View>
      <View className="ml-4 flex-1">
        <Text
          numberOfLines={3}
          className="text-xl font-semibold text-zinc-900 dark:text-zinc-50"
        >
          {manga.title}
        </Text>
        {status ? (
          <View
            className="mt-2 self-start rounded-full px-2.5 py-1"
            style={{ backgroundColor: colors.accentContainer }}
          >
            <Text
              className="text-xs font-semibold uppercase"
              style={{ color: colors.onAccentContainer }}
            >
              {status}
            </Text>
          </View>
        ) : null}
        {author ? (
          <Text
            numberOfLines={2}
            className="mt-2 text-sm text-zinc-700 dark:text-zinc-300"
          >
            {author}
          </Text>
        ) : null}
        {updated ? (
          <Text className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {`Actualizado ${updated}`}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function MangaProgress({
  readCount,
  total,
}: {
  readCount: number;
  total: number;
}) {
  const colors = useColors();
  const progressPercent =
    total > 0 ? Math.min(100, Math.round((readCount / total) * 100)) : 0;

  return (
    <View className="mt-4 px-4">
      <View className="h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <View
          className="h-full rounded-full"
          style={{ width: `${progressPercent}%`, backgroundColor: colors.accent }}
        />
      </View>
      <Text className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
        {`${readCount}/${total} capítulos leídos · ${progressPercent}%`}
      </Text>
    </View>
  );
}

function MangaSynopsis({ synopsis }: { synopsis: string }) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);
  // shortcut: length heuristic, measure the rendered lines if the synopsis copy changes.
  const longSynopsis = synopsis.length > 280;

  return (
    <View>
      <SectionTitle className="mb-3 mt-6 px-4">Sinopsis</SectionTitle>
      <Text
        numberOfLines={!expanded && longSynopsis ? 6 : undefined}
        className="px-4 text-sm text-zinc-700 dark:text-zinc-300"
      >
        {synopsis}
      </Text>
      {longSynopsis ? (
        <AppPressable
          accessibilityLabel={expanded ? 'Ver menos' : 'Ver más'}
          onPress={() => setExpanded((value) => !value)}
          className="mt-1 min-h-12 justify-center px-4 self-start"
        >
          <Text
            className="text-sm font-medium"
            style={{ color: colors.accent }}
          >
            {expanded ? 'Ver menos' : 'Ver más'}
          </Text>
        </AppPressable>
      ) : null}
    </View>
  );
}
