import { Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import type { MangaChapter } from '../source/leercapitulo';
import { Button } from './Button';

type Props = {
  currentTitle: string;
  next?: MangaChapter;
  prev?: MangaChapter;
  width: number;
  height: number;
  bottomInset: number;
  onOpenNext: (chapter: MangaChapter) => void;
  onOpenPrev: (chapter: MangaChapter) => void;
  onOpenPicker: () => void;
};

/** Full-page end-of-chapter card. */
export function ReaderTransition({
  currentTitle,
  next,
  prev,
  width,
  height,
  bottomInset,
  onOpenNext,
  onOpenPrev,
  onOpenPicker,
}: Props) {
  return (
    <Animated.View
      entering={FadeInDown.duration(250)}
      style={{ width, height, paddingBottom: bottomInset + 24 }}
      className="items-center justify-center bg-zinc-950 px-6 dark:bg-zinc-950"
    >
      <Text className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
        Fin del capítulo
      </Text>
      <Text className="mt-3 text-center text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        {currentTitle}
      </Text>

      <View className="my-6 h-px w-16 bg-zinc-200 dark:bg-zinc-800" />

      {next ? (
        <>
          <Text className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
            Siguiente
          </Text>
          <Text className="mt-3 text-center text-base text-zinc-700 dark:text-zinc-300">
            {next.title}
          </Text>
          <View className="mt-6 self-stretch">
            <Button
              variant="primary"
              size="lg"
              onPress={() => onOpenNext(next)}
            >
              Leer siguiente capítulo
            </Button>
          </View>
        </>
      ) : (
        <Text className="text-center text-sm text-zinc-500 dark:text-zinc-400">
          No hay capítulo siguiente.
        </Text>
      )}

      <View className="mt-3 self-stretch">
        <Button variant="secondary" onPress={onOpenPicker}>
          Elegir capítulo
        </Button>
      </View>

      {prev ? (
        <View className="mt-1 self-stretch">
          <Button variant="ghost" onPress={() => onOpenPrev(prev)}>
            Capítulo anterior
          </Button>
        </View>
      ) : null}
    </Animated.View>
  );
}
