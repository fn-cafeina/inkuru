import { Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import type { MangaChapter } from '../../../source/leercapitulo';
import { AppPressable } from '../../../components/AppPressable';
import { Button } from '../../../components/Button';

type Props = {
  currentTitle: string;
  next?: MangaChapter;
  prev?: MangaChapter;
  width: number;
  height: number;
  bottomInset: number;
  chapterIndex: number;
  onOpenNext: (chapter: MangaChapter) => void;
  onOpenPrev: (chapter: MangaChapter) => void;
  onOpenPicker: () => void;
  onToggleChrome: () => void;
};

/** Full-page end-of-chapter card. */
export function ReaderTransition({
  currentTitle,
  next,
  prev,
  width,
  height,
  bottomInset,
  chapterIndex,
  onOpenNext,
  onOpenPrev,
  onOpenPicker,
  onToggleChrome,
}: Props) {
  return (
    <Animated.View
      entering={FadeInDown.duration(250)}
      style={{ width, height, paddingBottom: bottomInset + 24 }}
      className="bg-zinc-950"
    >
      <AppPressable
        accessible={false}
        onPress={onToggleChrome}
        pressFeedback={false}
        className="flex-1 items-center justify-center px-4"
      >
        <Text className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Fin del capítulo
        </Text>
        <Text className="mt-3 text-center text-lg font-semibold text-zinc-100">
          {currentTitle}
        </Text>

        <View className="my-6 h-px w-16 bg-zinc-800" />

        {next ? (
          <>
            <Text className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
              Siguiente
            </Text>
            <Text className="mt-3 text-center text-base text-zinc-300">
              {next.title}
            </Text>
          </>
        ) : (
          <Text className="mt-3 text-center text-sm text-zinc-400">
            {chapterIndex < 0
              ? 'No hay capítulo siguiente.'
              : 'Último capítulo.'}
          </Text>
        )}

        <View className="mt-6 self-stretch gap-3">
          {next ? (
            <Button
              variant="primary"
              size="lg"
              onPress={() => onOpenNext(next)}
            >
              Siguiente capítulo
            </Button>
          ) : null}
          <Button variant="secondary" tone="dark" onPress={onOpenPicker}>
            Elegir capítulo
          </Button>
          {prev ? (
            <Button
              variant="ghost"
              tone="dark"
              onPress={() => onOpenPrev(prev)}
            >
              Capítulo anterior
            </Button>
          ) : null}
        </View>
      </AppPressable>
    </Animated.View>
  );
}
