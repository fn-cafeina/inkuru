import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { AppPressable } from '../components/AppPressable';
import { Screen } from '../components/Screen';
import { SectionTitle } from '../components/SectionTitle';
import {
  DEFAULT_READER_MODE,
  READER_MODE_OPTIONS,
  loadReaderMode,
  saveReaderMode,
} from '../storage/readerSettings';
import type { ReaderMode } from '../storage/readerSettings';

export default function SettingsScreen() {
  const [mode, setMode] = useState<ReaderMode>(DEFAULT_READER_MODE);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      void loadReaderMode().then((value) => {
        if (active) {
          setMode(value ?? DEFAULT_READER_MODE);
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

  return (
    <Screen>
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
      </View>
    </Screen>
  );
}

function OptionChip({
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
      accessibilityState={{ selected }}
      onPress={onPress}
      className={
        selected
          ? 'min-h-11 items-center justify-center rounded-full border border-transparent bg-accent-500 px-3'
          : 'min-h-11 items-center justify-center rounded-full border border-zinc-200 px-3 dark:border-zinc-800'
      }
    >
      <Text
        className={
          selected
            ? 'text-sm font-semibold text-white'
            : 'text-sm text-zinc-700 dark:text-zinc-300'
        }
      >
        {label}
      </Text>
    </AppPressable>
  );
}
