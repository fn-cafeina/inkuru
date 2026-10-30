import { Feather } from '@expo/vector-icons';
import { Modal, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppPressable } from '../../../components/AppPressable';
import { OptionChip } from '../../../components/OptionChip';
import { SectionTitle } from '../../../components/SectionTitle';
import {
  READER_MODE_OPTIONS,
  READER_QUALITY_OPTIONS,
  READER_SCALE_OPTIONS,
} from '../../../storage/readerSettings';
import type {
  ReaderMode,
  ReaderQuality,
  ReaderScale,
} from '../../../storage/readerSettings';
import { useColors } from '../../../theme/colors';
import { CARD } from '../../../theme/styles';

function ChipGroup<T extends string>({
  title,
  options,
  value,
  onSelect,
}: {
  title: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onSelect: (value: T) => void;
}) {
  return (
    <View>
      <SectionTitle>{title}</SectionTitle>
      <View className={`mt-2 flex-row flex-wrap gap-2 rounded-xl p-3 ${CARD}`}>
        {options.map((option) => (
          <OptionChip
            key={option.value}
            label={option.label}
            selected={value === option.value}
            onPress={() => onSelect(option.value)}
          />
        ))}
      </View>
    </View>
  );
}

export function ReaderSettingsSheet({
  visible,
  mode,
  scale,
  quality,
  onClose,
  onSelectMode,
  onSelectScale,
  onSelectQuality,
}: {
  visible: boolean;
  mode: ReaderMode;
  scale: ReaderScale;
  quality: ReaderQuality;
  onClose: () => void;
  onSelectMode: (mode: ReaderMode) => void;
  onSelectScale: (scale: ReaderScale) => void;
  onSelectQuality: (quality: ReaderQuality) => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View
        className="flex-1 justify-end"
        style={{ backgroundColor: colors.scrim }}
      >
        <AppPressable
          accessible={false}
          onPress={onClose}
          pressFeedback={false}
          className="absolute inset-0"
        />
        <View
          className="rounded-t-xl border-t border-zinc-800 bg-zinc-900"
          style={{ maxHeight: '85%' }}
        >
          <View className="flex-row items-center justify-between pr-4">
            <SectionTitle className="px-4 text-zinc-100">
              Ajustes de lectura
            </SectionTitle>
            <AppPressable
              accessibilityLabel="Cerrar"
              onPress={onClose}
              className="min-h-12 min-w-12 items-center justify-center rounded-lg"
            >
              <Feather name="x" size={20} color={colors.text} />
            </AppPressable>
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
            contentContainerClassName="px-4 gap-4"
          >
            <ChipGroup
              title="Modo de lectura"
              options={READER_MODE_OPTIONS}
              value={mode}
              onSelect={onSelectMode}
            />
            <ChipGroup
              title="Ajuste de página"
              options={READER_SCALE_OPTIONS}
              value={scale}
              onSelect={onSelectScale}
            />
            <ChipGroup
              title="Calidad de imagen"
              options={READER_QUALITY_OPTIONS}
              value={quality}
              onSelect={onSelectQuality}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
