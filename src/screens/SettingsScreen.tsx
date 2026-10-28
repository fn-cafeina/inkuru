import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { AppPressable } from '../components/AppPressable';
import { Screen } from '../components/Screen';
import { SectionTitle } from '../components/SectionTitle';
import { loadReaderMode, saveReaderMode } from '../storage/readerSettings';
import type { ReaderMode } from '../storage/readerSettings';

const MODES: { value: ReaderMode; label: string }[] = [
  { value: 'vertical', label: 'Cascada' },
  { value: 'paged', label: 'Páginas' },
];

export default function SettingsScreen() {
  const [mode, setMode] = useState<ReaderMode>('vertical');

  useFocusEffect(
    useCallback(() => {
      let active = true;

      void loadReaderMode().then((value) => {
        if (active && value) {
          setMode(value);
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
      <View className="mx-4">
        <Text className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Modo de lectura
        </Text>
        <Text className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Se aplica al abrir un capítulo.
        </Text>
        <View className="mt-3 flex-row rounded-xl border border-zinc-200 p-1 dark:border-zinc-800">
          {MODES.map((option) => {
            const selected = mode === option.value;

            return (
              <AppPressable
                key={option.value}
                accessibilityState={{ selected }}
                onPress={() => selectMode(option.value)}
                className={
                  selected
                    ? 'min-h-12 flex-1 items-center justify-center rounded-md bg-accent-500'
                    : 'min-h-12 flex-1 items-center justify-center rounded-md'
                }
              >
                <Text
                  className={
                    selected
                      ? 'text-sm font-semibold text-white'
                      : 'text-sm text-zinc-700 dark:text-zinc-300'
                  }
                >
                  {option.label}
                </Text>
              </AppPressable>
            );
          })}
        </View>
      </View>
    </Screen>
  );
}
