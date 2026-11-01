import { Feather } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { AppPressable } from '../../../components/AppPressable';
import type { MangaChapter } from '../../../source/zonatmo';
import { palette } from '../../../theme/colors';

const BAR_BACKGROUND = 'rgba(9, 9, 11, 0.7)';

export function ReaderProgressBar({
  page,
  total,
  bottomInset,
  prev,
  next,
  onOpenPrev,
  onOpenNext,
}: {
  page: number;
  total: number;
  bottomInset: number;
  prev?: MangaChapter;
  next?: MangaChapter;
  onOpenPrev: (chapter: MangaChapter) => void;
  onOpenNext: (chapter: MangaChapter) => void;
}) {
  if (total <= 0) {
    return null;
  }

  return (
    <Animated.View
      entering={FadeIn.duration(150)}
      exiting={FadeOut.duration(150)}
      pointerEvents="box-none"
      className="absolute left-4 right-4 flex-row items-center"
      style={{ bottom: bottomInset + 8 }}
    >
      <AppPressable
        accessibilityLabel="Capítulo anterior"
        accessibilityState={{ disabled: !prev }}
        disabled={!prev}
        onPress={() => {
          if (prev) {
            onOpenPrev(prev);
          }
        }}
        className={`mr-2 min-h-12 min-w-12 items-center justify-center rounded-full border border-zinc-800 ${
          prev ? '' : 'opacity-40'
        }`}
        style={{ backgroundColor: BAR_BACKGROUND }}
      >
        <Feather name="chevrons-left" size={18} color={palette.dark.text} />
      </AppPressable>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel="Progreso de lectura"
        accessibilityValue={{ min: 1, max: total, now: page + 1 }}
        className="flex-1 flex-row items-center rounded-full px-3 py-2"
        style={{ backgroundColor: BAR_BACKGROUND }}
      >
        <View
          className="h-0.5 flex-1 overflow-hidden rounded-full"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.25)' }}
        >
          <View
            className="h-full rounded-full"
            style={{
              width: `${((page + 1) / total) * 100}%`,
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
            }}
          />
        </View>
        <Text className="ml-3 text-xs font-semibold text-white">
          {page + 1} / {total}
        </Text>
      </View>
      <AppPressable
        accessibilityLabel="Capítulo siguiente"
        accessibilityState={{ disabled: !next }}
        disabled={!next}
        onPress={() => {
          if (next) {
            onOpenNext(next);
          }
        }}
        className={`ml-2 min-h-12 min-w-12 items-center justify-center rounded-full border border-zinc-800 ${
          next ? '' : 'opacity-40'
        }`}
        style={{ backgroundColor: BAR_BACKGROUND }}
      >
        <Feather name="chevrons-right" size={18} color={palette.dark.text} />
      </AppPressable>
    </Animated.View>
  );
}
