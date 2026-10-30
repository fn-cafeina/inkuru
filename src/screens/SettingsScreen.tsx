import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import { ScrollView, Switch, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { AppPressable } from '../components/AppPressable';
import { PageTitle } from '../components/PageTitle';
import { Screen } from '../components/Screen';
import { Skeleton } from '../components/Skeleton';
import { useColors } from '../theme/colors';
import {
  DEFAULT_READER_MODE,
  DEFAULT_READER_QUALITY,
  DEFAULT_READER_SCALE,
  READER_MODE_OPTIONS,
  READER_QUALITY_OPTIONS,
  READER_SCALE_OPTIONS,
  loadKeepAwake,
  loadReaderMode,
  loadReaderQuality,
  loadReaderScale,
  saveKeepAwake,
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
  const [mode, setMode] = useState<ReaderMode>(DEFAULT_READER_MODE);
  const [scale, setScale] = useState<ReaderScale>(DEFAULT_READER_SCALE);
  const [quality, setQuality] = useState<ReaderQuality>(DEFAULT_READER_QUALITY);
  const [keepAwake, setKeepAwake] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      void Promise.all([
        loadReaderMode(),
        loadReaderScale(),
        loadReaderQuality(),
        loadKeepAwake(),
      ]).then(([storedMode, storedScale, storedQuality, storedKeepAwake]) => {
        if (active) {
          setMode(storedMode ?? DEFAULT_READER_MODE);
          setScale(storedScale ?? DEFAULT_READER_SCALE);
          setQuality(storedQuality ?? DEFAULT_READER_QUALITY);
          setKeepAwake(storedKeepAwake);
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

  const selectKeepAwake = (next: boolean) => {
    setKeepAwake(next);
    void saveKeepAwake(next);
  };

  return (
    <Screen>
      <PageTitle>Ajustes</PageTitle>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-4 pb-6"
      >
        {loaded ? (
          <>
            <SettingsSection title="Modo de lectura" groupRole="radiogroup">
              {READER_MODE_OPTIONS.map((option, index) => (
                <SelectRow
                  key={option.value}
                  label={option.label}
                  selected={mode === option.value}
                  divider={index > 0}
                  onPress={() => selectMode(option.value)}
                />
              ))}
            </SettingsSection>

            <SettingsSection title="Ajuste de página" groupRole="radiogroup">
              {READER_SCALE_OPTIONS.map((option, index) => (
                <SelectRow
                  key={option.value}
                  label={option.label}
                  selected={scale === option.value}
                  divider={index > 0}
                  onPress={() => selectScale(option.value)}
                />
              ))}
            </SettingsSection>

            <SettingsSection title="Calidad de imagen" groupRole="radiogroup">
              {READER_QUALITY_OPTIONS.map((option, index) => (
                <SelectRow
                  key={option.value}
                  label={option.label}
                  selected={quality === option.value}
                  divider={index > 0}
                  onPress={() => selectQuality(option.value)}
                />
              ))}
            </SettingsSection>

            <SettingsSection title="Pantalla despierta">
              <SwitchRow
                label="Mantener la pantalla encendida"
                value={keepAwake}
                onValueChange={selectKeepAwake}
              />
            </SettingsSection>
          </>
        ) : (
          <SettingsSkeleton />
        )}
      </ScrollView>
    </Screen>
  );
}

function SettingsSkeleton() {
  return (
    <View>
      {[0, 1, 2, 3].map((index) => (
        <View key={index} className="mt-6">
          <Skeleton className="h-3 w-32 rounded" />
          <Skeleton className="mt-3 h-24 rounded-2xl" />
        </View>
      ))}
    </View>
  );
}

function SettingsSection({
  title,
  groupRole,
  children,
}: {
  title: string;
  groupRole?: 'radiogroup';
  children: ReactNode;
}) {
  return (
    <View className="mt-6">
      <Text
        accessibilityRole="header"
        className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
      >
        {title}
      </Text>
      <View
        accessibilityRole={groupRole}
        className="overflow-hidden rounded-2xl bg-white dark:bg-zinc-900"
      >
        {children}
      </View>
    </View>
  );
}

function SelectRow({
  label,
  selected,
  divider,
  onPress,
}: {
  label: string;
  selected: boolean;
  divider: boolean;
  onPress: () => void;
}) {
  return (
    <AppPressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`min-h-14 flex-row items-center px-4 ${
        divider ? 'border-t border-zinc-200 dark:border-zinc-800' : ''
      }`}
    >
      <Text className="flex-1 text-base text-zinc-900 dark:text-zinc-100">
        {label}
      </Text>
      <RadioMark selected={selected} />
    </AppPressable>
  );
}

function RadioMark({ selected }: { selected: boolean }) {
  return (
    <View
      className={`h-5 w-5 items-center justify-center rounded-full border-2 ${
        selected
          ? 'border-accent-500'
          : 'border-zinc-400 dark:border-zinc-600'
      }`}
    >
      {selected ? (
        <View className="h-2.5 w-2.5 rounded-full bg-accent-500" />
      ) : null}
    </View>
  );
}

function SwitchRow({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  const colors = useColors();

  return (
    <View className="min-h-14 flex-row items-center px-4">
      <Text className="flex-1 text-base text-zinc-900 dark:text-zinc-100">
        {label}
      </Text>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.accent }}
        thumbColor="#ffffff"
      />
    </View>
  );
}
