import { useCallback, useState } from 'react';
import { Alert, ScrollView, Switch, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';

import { ChoiceRow } from '../components/ChoiceRow';
import { AppPressable } from '../components/AppPressable';
import { PageTitle } from '../components/PageTitle';
import { Screen } from '../components/Screen';
import { SettingSection } from '../components/SettingSection';
import {
  clearRemoteDataMemory,
} from '../hooks/useRemoteData';
import { clearQueryCache } from '../storage/queryCache';
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
  const colors = useColors();
  const [mode, setMode] = useState<ReaderMode>(DEFAULT_READER_MODE);
  const [scale, setScale] = useState<ReaderScale>(DEFAULT_READER_SCALE);
  const [quality, setQuality] = useState<ReaderQuality>(DEFAULT_READER_QUALITY);
  const [keepAwake, setKeepAwake] = useState(true);

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

  const confirmClearCache = () => {
    Alert.alert(
      'Borrar caché',
      'Se eliminarán los datos e imágenes temporales. Las descargas se conservan.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar',
          style: 'destructive',
          onPress: () => {
            clearRemoteDataMemory();
            void Promise.all([
              clearQueryCache(),
              Image.clearMemoryCache(),
              Image.clearDiskCache(),
            ]).then(() => {
              Alert.alert('Caché borrada');
            });
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <PageTitle>Ajustes</PageTitle>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-4 pb-6"
      >
        <SettingSection
          title="Modo de lectura"
          groupRole="radiogroup"
          className="mt-0"
        >
          {READER_MODE_OPTIONS.map((option, index) => (
            <ChoiceRow
              key={option.value}
              label={option.label}
              selected={mode === option.value}
              divider={index > 0}
              onPress={() => selectMode(option.value)}
            />
          ))}
        </SettingSection>
        <SettingSection title="Escala de página" groupRole="radiogroup">
          {READER_SCALE_OPTIONS.map((option, index) => (
            <ChoiceRow
              key={option.value}
              label={option.label}
              selected={scale === option.value}
              divider={index > 0}
              disabled={mode === 'webtoon'}
              onPress={() => selectScale(option.value)}
            />
          ))}
        </SettingSection>

        <SettingSection title="Calidad de imagen" groupRole="radiogroup">
          {READER_QUALITY_OPTIONS.map((option, index) => (
            <ChoiceRow
              key={option.value}
              label={option.label}
              selected={quality === option.value}
              divider={index > 0}
              onPress={() => selectQuality(option.value)}
            />
          ))}
        </SettingSection>

        <SettingSection title="Pantalla">
          <SwitchRow
            label="Mantener encendida"
            value={keepAwake}
            onValueChange={selectKeepAwake}
          />
        </SettingSection>

        <SettingSection title="Almacenamiento">
          <AppPressable
            accessibilityRole="button"
            accessibilityLabel="Borrar caché"
            accessibilityHint="Borra datos e imágenes temporales. Las descargas se conservan."
            onPress={confirmClearCache}
            className="min-h-14 flex-row items-center px-4"
          >
            <Feather name="trash-2" size={18} color={colors.iconInactive} />
            <View className="ml-3 flex-1">
              <Text className="text-base text-zinc-900 dark:text-zinc-100">
                Borrar caché
              </Text>
              <Text className="text-xs text-zinc-500 dark:text-zinc-400">
                Las descargas se conservan.
              </Text>
            </View>
          </AppPressable>
        </SettingSection>
      </ScrollView>
    </Screen>
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
    <AppPressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={() => onValueChange(!value)}
      className="min-h-14 flex-row items-center px-4"
    >
      <Text className="flex-1 text-base text-zinc-900 dark:text-zinc-100">
        {label}
      </Text>
      <Switch
        accessible={false}
        pointerEvents="none"
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.iconInactive, true: colors.accent }}
        thumbColor="#ffffff"
      />
    </AppPressable>
  );
}
