import { useCallback } from 'react';
import { ScrollView, Switch, Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { AppPressable } from '../components/AppPressable';
import { PageTitle } from '../components/PageTitle';
import { ReaderPreferenceSections } from '../components/ReaderPreferenceSections';
import { Screen } from '../components/Screen';
import { SettingSection } from '../components/SettingSection';
import { useReaderSettings } from '../hooks/useReaderSettings';
import { useColors } from '../theme/colors';

export default function SettingsScreen() {
  const {
    mode,
    scale,
    quality,
    keepAwake,
    restore,
    selectMode,
    selectScale,
    selectQuality,
    selectKeepAwake,
  } = useReaderSettings();

  useFocusEffect(
    useCallback(() => {
      let active = true;

      void restore(() => active);

      return () => {
        active = false;
      };
    }, [restore]),
  );

  return (
    <Screen>
      <PageTitle>Ajustes</PageTitle>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-4 pb-6"
      >
        <ReaderPreferenceSections
          mode={mode}
          scale={scale}
          quality={quality}
          onSelectMode={selectMode}
          onSelectScale={selectScale}
          onSelectQuality={selectQuality}
          firstSectionClassName="mt-0"
        />

        <SettingSection title="Pantalla">
          <SwitchRow
            label="Mantener encendida"
            value={keepAwake}
            onValueChange={selectKeepAwake}
          />
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
