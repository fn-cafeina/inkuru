import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OptionChip } from '../components/OptionChip';
import { Screen } from '../components/Screen';
import { SectionTitle } from '../components/SectionTitle';
import { TAB_BAR_SPACE } from '../navigation/tabBar';
import {
  DEFAULT_READER_MODE,
  DEFAULT_READER_QUALITY,
  DEFAULT_READER_SCALE,
  READER_MODE_OPTIONS,
  READER_QUALITY_OPTIONS,
  READER_SCALE_OPTIONS,
  loadReaderMode,
  loadReaderQuality,
  loadReaderScale,
  saveReaderMode,
  saveReaderQuality,
  saveReaderScale,
} from '../storage/readerSettings';
import type {
  ReaderMode,
  ReaderQuality,
  ReaderScale,
} from '../storage/readerSettings';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<ReaderMode>(DEFAULT_READER_MODE);
  const [scale, setScale] = useState<ReaderScale>(DEFAULT_READER_SCALE);
  const [quality, setQuality] = useState<ReaderQuality>(DEFAULT_READER_QUALITY);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      void Promise.all([
        loadReaderMode(),
        loadReaderScale(),
        loadReaderQuality(),
      ]).then(([storedMode, storedScale, storedQuality]) => {
        if (active) {
          setMode(storedMode ?? DEFAULT_READER_MODE);
          setScale(storedScale ?? DEFAULT_READER_SCALE);
          setQuality(storedQuality ?? DEFAULT_READER_QUALITY);
        }
      });

      return () => {
        active = false;
      };
    }, []),
  );

  const selectMode = (next: ReaderMode) => {
    setMode(next);
    void saveReaderMode(next);
  };

  const selectScale = (next: ReaderScale) => {
    setScale(next);
    void saveReaderScale(next);
  };

  const selectQuality = (next: ReaderQuality) => {
    setQuality(next);
    void saveReaderQuality(next);
  };

  return (
    <Screen>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + TAB_BAR_SPACE,
        }}
      >
        <View className="px-4 pb-6 pt-3">
          <Text className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Ajustes
          </Text>
        </View>

        <SectionTitle className="mb-3 mt-7 px-4">Lector</SectionTitle>
        <View className="px-4">
          <Text className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Modo de lectura
          </Text>
          <View className="mt-3 flex-row flex-wrap gap-2">
            {READER_MODE_OPTIONS.map((option) => (
              <OptionChip
                key={option.value}
                label={option.label}
                selected={mode === option.value}
                onPress={() => selectMode(option.value)}
              />
            ))}
          </View>
          <Text className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            Tradicional: izquierda a derecha. Manga: derecha a izquierda.
          </Text>

          <Text className="mt-6 text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Ajuste de página
          </Text>
          <View className="mt-3 flex-row flex-wrap gap-2">
            {READER_SCALE_OPTIONS.map((option) => (
              <OptionChip
                key={option.value}
                label={option.label}
                selected={scale === option.value}
                onPress={() => selectScale(option.value)}
              />
            ))}
          </View>
          <Text className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            Se aplica al modo páginas. En cascada la página ocupa el ancho.
          </Text>

          <Text className="mt-6 text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Calidad de imagen
          </Text>
          <View className="mt-3 flex-row flex-wrap gap-2">
            {READER_QUALITY_OPTIONS.map((option) => (
              <OptionChip
                key={option.value}
                label={option.label}
                selected={quality === option.value}
                onPress={() => selectQuality(option.value)}
              />
            ))}
          </View>
          <Text className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            Más calidad usa más memoria; en tiras largas puede tardar más.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}
