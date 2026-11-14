import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ReaderPreferenceSections } from '../../../components/ReaderPreferenceSections';
import { SettingSection } from '../../../components/SettingSection';
import { SwitchRow } from '../../../components/SwitchRow';
import type {
  ReaderMode,
  ReaderQuality,
  ReaderScale,
} from '../../../storage/readerSettings';
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
            title="Mantener encendida"
            value={keepAwake}
            onValueChange={onSelectKeepAwake}
          />
        </SettingSection>
      </ScrollView>
    </ReaderSheet>
  );
}
