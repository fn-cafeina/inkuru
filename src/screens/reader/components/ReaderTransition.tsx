import { ScrollView, Text, View, Pressable } from 'react-native';
import Animated, {
  FadeInDown,
  useReducedMotion,
} from 'react-native-reanimated';

import type { MangaChapter } from '../../../source/zonatmo';
import { Button } from '../../../components/Button';
import { reader } from '../../../theme/colors';

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
  const reduced = useReducedMotion();

  return (
    <Animated.View
      entering={reduced ? undefined : FadeInDown.duration(250)}
      style={{ width, height, backgroundColor: reader.background }}
    >
      <Pressable
        accessible={false}
        onPress={onToggleChrome}
        className="flex-1"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          className="flex-1"
          contentContainerClassName="flex-grow items-center justify-center px-4"
          contentContainerStyle={{ paddingBottom: bottomInset + 24 }}
        >
          <Text
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: reader.textMuted }}
          >
            Fin del capítulo
          </Text>

          {next ? (
            <>
              <Text
                className="mt-6 text-xs font-semibold uppercase tracking-widest"
                style={{ color: reader.textMuted }}
              >
                Siguiente
              </Text>
              <Text
                className="mt-3 text-center text-base"
                style={{ color: reader.text }}
              >
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
            <Text
              className="mt-6 text-center text-sm"
              style={{ color: reader.textMuted }}
            >
              {chapterIndex < 0
                ? 'No hay capítulo siguiente.'
                : 'Último capítulo.'}
            </Text>
          )}
        </ScrollView>
      </Pressable>
    </Animated.View>
  );
}
