import { useCallback, useState } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OptionChip } from '../components/OptionChip';
import { Screen } from '../components/Screen';
import { SectionTitle } from '../components/SectionTitle';
import { TAB_BAR_SPACE } from '../navigation/tabBar';
import { useColors } from '../theme/colors';
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

type FeatherName = ComponentProps<typeof Feather>['name'];

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
              icon="book-open"
              title="Modo de lectura"
            >
              {READER_MODE_OPTIONS.map((option) => (
                <OptionChip
                  key={option.value}
                  label={option.label}
                  selected={mode === option.value}
                  onPress={() => selectMode(option.value)}
                />
              ))}
            </SettingsGroup>

            <SettingsGroup
              icon="maximize"
              title="Ajuste de página"
            >
              {READER_SCALE_OPTIONS.map((option) => (
                <OptionChip
                  key={option.value}
                  label={option.label}
                  selected={scale === option.value}
                  onPress={() => selectScale(option.value)}
                />
              ))}
            </SettingsGroup>

            <SettingsGroup
              icon="image"
              title="Calidad de imagen"
            >
              {READER_QUALITY_OPTIONS.map((option) => (
                <OptionChip
                  key={option.value}
                  label={option.label}
                  selected={quality === option.value}
                  onPress={() => selectQuality(option.value)}
                />
              ))}
            </SettingsGroup>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function SettingsGroup({
  icon,
  title,
  children,
}: {
  icon: FeatherName;
  title: string;
  children: ReactNode;
}) {
  const colors = useColors();

  return (
    <View className="mt-6 px-4">
      <View className="flex-row items-center gap-1.5">
        <Feather name={icon} size={16} color={colors.accent} />
        <SectionTitle>{title}</SectionTitle>
      </View>
      <View
        accessibilityRole="radiogroup"
        className="mt-2 flex-row flex-wrap gap-2 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
      >
        {children}
      </View>
    </View>
  );
}
