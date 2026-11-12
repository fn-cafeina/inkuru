import { ScrollView, Switch, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppPressable } from '../../../components/AppPressable';
import { ReaderPreferenceSections } from '../../../components/ReaderPreferenceSections';
import { SettingSection } from '../../../components/SettingSection';
import type {
  ReaderMode,
  ReaderQuality,
  ReaderScale,
} from '../../../storage/readerSettings';
import { useColors } from '../../../theme/colors';
import { ReaderSheet } from './ReaderSheet';

export function ReaderSettingsSheet({
  visible,
  mode,
  scale,
  quality,
  keepAwake,
  onClose,
  onSelectMode,
  onSelectScale,
  onSelectQuality,
  onSelectKeepAwake,
}: {
  visible: boolean;
  mode: ReaderMode;
  scale: ReaderScale;
  quality: ReaderQuality;
  keepAwake: boolean;
  onClose: () => void;
  onSelectMode: (mode: ReaderMode) => void;
  onSelectScale: (scale: ReaderScale) => void;
  onSelectQuality: (quality: ReaderQuality) => void;
  onSelectKeepAwake: (keepAwake: boolean) => void;
}) {
  const insets = useSafeAreaInsets();

  if (!visible) {
    return null;
  }

  return (
    <ReaderSheet title="Lectura" onClose={onClose}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
        contentContainerClassName="px-4"
      >
        <ReaderPreferenceSections
          mode={mode}
          scale={scale}
          quality={quality}
          onSelectMode={onSelectMode}
          onSelectScale={onSelectScale}
          onSelectQuality={onSelectQuality}
          firstSectionClassName="mt-2"
        />
        <SettingSection title="Pantalla">
          <SwitchRow
            label="Mantener encendida"
            value={keepAwake}
            onValueChange={onSelectKeepAwake}
          />
        </SettingSection>
      </ScrollView>
    </ReaderSheet>
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
      {/* The row owns the gesture and the a11y role, so the switch is
          decoration only: no handler, or it would be pressed twice. */}
      <Switch
        accessible={false}
        pointerEvents="none"
        value={value}
        trackColor={{ false: colors.iconInactive, true: colors.accent }}
        thumbColor="#ffffff"
      />
    </AppPressable>
  );
}
