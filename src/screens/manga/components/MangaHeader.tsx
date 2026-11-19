import { memo, useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import type { ScrollViewInstance } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { Button } from '@/components/Button';
import { OptionChip } from '@/components/OptionChip';
import { SectionTitle } from '@/components/SectionTitle';
import type { MangaChapter, MangaDetail } from '@/source/zonatmo';
import { useColors } from '@/theme/colors';
import type { ChapterRange } from '@/screens/manga/chapters';
import { MangaCoverInfo, mangaStatusLabel } from './MangaCoverInfo';
import { MangaRelated } from './MangaRelated';
import { TagRow } from './TagRow';

type Props = {
  manga: MangaDetail;
  readCount: number;
  resumeChapter?: MangaChapter;
  sortOrder: 'asc' | 'desc';
  ranges: ChapterRange[];
  activeRange: number;
  onSelectRange: (index: number) => void;
  onToggleSort: () => void;
  onOpenRelated: (path: string, title: string) => void;
  onRead: (chapter: MangaChapter) => void;
  ready: boolean;
};

function MangaHeaderBase({
  manga,
  readCount,
  resumeChapter,
  sortOrder,
  ranges,
  activeRange,
  onSelectRange,
  onToggleSort,
  onOpenRelated,
  onRead,
  ready,
}: Props) {
  const colors = useColors();
  const chipRowRef = useRef<ScrollViewInstance>(null);
  const chipXs = useRef<(number | undefined)[]>([]);

  // Bring the selected chip into view: on restore the row starts at offset 0,
  // and a remembered middle range would otherwise be off screen.
  useEffect(() => {
    const x = chipXs.current[activeRange];

    if (x !== undefined) {
      chipRowRef.current?.scrollTo({ x, animated: false });
    }
  }, [activeRange]);
  const status = mangaStatusLabel(manga.status);
  const firstChapter = manga.chapters[manga.chapters.length - 1];
  const readChapter = resumeChapter ?? firstChapter;

  return (
    <View>
      <MangaCoverInfo
        cover={manga.cover}
        title={manga.title}
        status={status}
      />

      {manga.tags.length > 0 ? (
        <View className="mt-4 px-5">
          <TagRow tags={manga.tags} />
        </View>
      ) : null}

      {readChapter ? (
        <View className="mt-4 px-5">
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

      {manga.synopsis ? <MangaSynopsis synopsis={manga.synopsis} /> : null}

      {manga.related.length > 0 ? (
        <View className="mt-6 px-5">
          <SectionTitle className="mb-3">Relacionados</SectionTitle>
          <MangaRelated items={manga.related} onOpen={onOpenRelated} />
        </View>
      ) : null}

      <View className="mt-6 px-5">
        <View className="flex-row items-center justify-between">
          <SectionTitle>{`Capítulos (${manga.chapters.length})`}</SectionTitle>
          <AnimatedPressable
            accessibilityLabel={
              sortOrder === 'asc'
                ? 'Ordenar capítulos: más recientes primero'
                : 'Ordenar capítulos: más antiguos primero'
            }
            accessibilityHint="Toca para invertir el orden"
            hitSlop={4}
            onPress={onToggleSort}
            className="min-h-12 min-w-12 items-center justify-center"
          >
            <Feather
              name={sortOrder === 'asc' ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.accent}
            />
          </AnimatedPressable>
        </View>
        {ranges.length > 1 ? (
          <View
            className="mt-3"
            accessibilityRole="radiogroup"
            accessibilityLabel="Rangos de capítulos"
          >
            <ScrollView
              ref={chipRowRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-3 pb-3"
            >
              {ranges.map((range, index) => (
                <View
                  key={`${range.label}-${index}`}
                  onLayout={(event) => {
                    const x = event.nativeEvent.layout.x;

                    chipXs.current[index] = x;

                    // First layout runs after the restore effect above.
                    if (index === activeRange) {
                      chipRowRef.current?.scrollTo({ x, animated: false });
                    }
                  }}
                >
                  <OptionChip
                    label={range.label}
                    accessibilityLabel={`Capítulos ${range.label.replace('-', ' a ')}`}
                    selected={index === activeRange}
                    onPress={() => onSelectRange(index)}
                  />
                </View>
              ))}
            </ScrollView>
          </View>
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
    <View className="mt-4 px-5">
      <View className="h-1.5 overflow-hidden rounded-full bg-neutral-800">
        <View
          className="h-full rounded-full"
          style={{ width: `${progressPercent}%`, backgroundColor: colors.accent }}
        />
      </View>
      <Text className="mt-1.5 text-xs text-neutral-400">
        {`${readCount} de ${total} capítulos leídos`}
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
      <SectionTitle className="mb-3 mt-6 px-5">Sinopsis</SectionTitle>
      <AnimatedPressable
        accessibilityRole="button"
        onPress={() => setExpanded((value) => !value)}
      >
        <Text
          numberOfLines={!expanded && longSynopsis ? 6 : undefined}
          className="px-5 text-sm font-medium leading-6 text-neutral-400"
        >
          {synopsis}
        </Text>
        {longSynopsis ? (
          <Text
            className="mt-2 px-5 text-sm font-bold leading-6"
            style={{ color: colors.accent }}
          >
            {expanded ? 'Ver menos' : 'Ver más'}
          </Text>
        ) : null}
      </AnimatedPressable>
    </View>
  );
}
export const MangaHeader = memo(MangaHeaderBase);
