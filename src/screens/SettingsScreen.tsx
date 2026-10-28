import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppPressable } from '../components/AppPressable';
import { ListDivider } from '../components/ListDivider';
import { Screen } from '../components/Screen';
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
  const [loaded, setLoaded] = useState(false);

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
          setLoaded(true);
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
        <Text
          accessibilityRole="header"
          className="px-4 pt-4 text-2xl font-semibold text-zinc-900 dark:text-zinc-50"
        >
          Ajustes
        </Text>

        {loaded ? (
          <>
            <SettingsGroup
              title="Modo de lectura"
              helper="Tradicional: izquierda a derecha. Manga: derecha a izquierda."
            >
              {READER_MODE_OPTIONS.map((option, index) => (
                <View key={option.value}>
                  {index > 0 ? <ListDivider /> : null}
                  <RadioRow
                    label={option.label}
                    selected={mode === option.value}
                    onPress={() => selectMode(option.value)}
                  />
                </View>
              ))}
            </SettingsGroup>

            <SettingsGroup
              title="Ajuste de página"
              helper="Se aplica al modo páginas. En cascada la página ocupa el ancho."
            >
              {READER_SCALE_OPTIONS.map((option, index) => (
                <View key={option.value}>
                  {index > 0 ? <ListDivider /> : null}
                  <RadioRow
                    label={option.label}
                    selected={scale === option.value}
                    onPress={() => selectScale(option.value)}
                  />
                </View>
              ))}
            </SettingsGroup>

            <SettingsGroup
              title="Calidad de imagen"
              helper="Más calidad usa más memoria; en tiras largas puede tardar más."
            >
              {READER_QUALITY_OPTIONS.map((option, index) => (
                <View key={option.value}>
                  {index > 0 ? <ListDivider /> : null}
                  <RadioRow
                    label={option.label}
                    selected={quality === option.value}
                    onPress={() => selectQuality(option.value)}
                  />
                </View>
              ))}
            </SettingsGroup>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function SettingsGroup({
  title,
  helper,
  children,
}: {
  title: string;
  helper: string;
  children: ReactNode;
}) {
  return (
    <View className="mt-6 px-4">
      <Text
        accessibilityRole="header"
        className="text-sm font-semibold text-zinc-900 dark:text-zinc-100"
      >
        {title}
      </Text>
      <View
        accessibilityRole="radiogroup"
        className="mt-2 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
      >
        {children}
      </View>
      <Text className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        {helper}
      </Text>
    </View>
  );
}

function RadioRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <AppPressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      className="min-h-14 flex-row items-center px-4 py-3"
    >
      <Text className="mr-3 flex-1 text-base text-zinc-900 dark:text-zinc-100">
        {label}
      </Text>
      <View
        className={
          selected
            ? 'h-5 w-5 items-center justify-center rounded-full border-2 border-accent-500'
            : 'h-5 w-5 items-center justify-center rounded-full border-2 border-zinc-300 dark:border-zinc-600'
        }
      >
        {selected ? (
          <View className="h-2.5 w-2.5 rounded-full bg-accent-500" />
        ) : null}
      </View>
    </AppPressable>
  );
}
