import { ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import type { MangaChapter } from '../../../source/zonatmo';
import { AppPressable } from '../../../components/AppPressable';
import { Button } from '../../../components/Button';

type Props = {
  next?: MangaChapter;
  width: number;
  height: number;
  bottomInset: number;
  chapterIndex: number;
  onOpenNext: (chapter: MangaChapter) => void;
  onToggleChrome: () => void;
};

/** Full-page end-of-chapter card. */
export function ReaderTransition({
  next,
  width,
  height,
  bottomInset,
  chapterIndex,
  onOpenNext,
  onToggleChrome,
}: Props) {
  return (
    <Animated.View
      entering={FadeInDown.duration(250)}
      style={{ width, height }}
      className="bg-zinc-950"
    >
      <AppPressable
        accessible={false}
        onPress={onToggleChrome}
        pressFeedback={false}
        className="flex-1"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          className="flex-1"
          contentContainerClassName="flex-grow items-center justify-center px-4"
          contentContainerStyle={{ paddingBottom: bottomInset + 24 }}
        >
          <Text className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Fin del capítulo
          </Text>

          {next ? (
            <>
              <Text className="mt-6 text-xs font-semibold uppercase tracking-widest text-zinc-400">
                Siguiente
              </Text>
              <Text className="mt-3 text-center text-base text-zinc-300">
                {next.title}
              </Text>
              <View className="mt-6 self-stretch">
                <Button
                  variant="primary"
                  size="lg"
                  onPress={() => onOpenNext(next)}
                >
                  Siguiente capítulo
                </Button>
              </View>
            </>
          ) : (
            <Text className="mt-6 text-center text-sm text-zinc-400">
              {chapterIndex < 0
                ? 'No hay capítulo siguiente.'
                : 'Último capítulo.'}
            </Text>
          )}
        </ScrollView>
      </AppPressable>
    </Animated.View>
  );
}