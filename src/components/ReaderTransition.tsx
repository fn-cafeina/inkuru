import { Text, View } from 'react-native';

import type { MangaChapter } from '../source/leercapitulo';
import { AppPressable } from './AppPressable';

type Props = {
  currentTitle: string;
  next?: MangaChapter;
  width: number;
  height: number;
  bottomInset: number;
  onOpenNext: (chapter: MangaChapter) => void;
  onOpenPicker: () => void;
};

/** Full-page end-of-chapter card that replaces the old prev/next footer. */
export function ReaderTransition({
  currentTitle,
  next,
  width,
  height,
  bottomInset,
  onOpenNext,
  onOpenPicker,
}: Props) {
  return (
    <View
      style={{ width, minHeight: height, paddingBottom: bottomInset + 24 }}
      className="items-center justify-center bg-zinc-50 px-6 dark:bg-zinc-950"
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
          <AppPressable
            accessibilityLabel={`Leer ${next.title}`}
            onPress={() => onOpenNext(next)}
            className="mt-6 min-h-12 items-center justify-center rounded-xl bg-accent-500 px-6"
          >
            <Text className="text-sm font-semibold text-white">
              Leer siguiente capítulo
            </Text>
          </AppPressable>
        </>
      ) : (
        <Text className="text-center text-sm text-zinc-500 dark:text-zinc-400">
          No hay capítulo siguiente.
        </Text>
      )}

      <AppPressable
        accessibilityLabel="Elegir capítulo"
        onPress={onOpenPicker}
        className="mt-3 min-h-12 items-center justify-center rounded-xl border border-zinc-200 px-6 dark:border-zinc-800"
      >
        <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Elegir capítulo
        </Text>
      </AppPressable>
    </View>
  );
}
