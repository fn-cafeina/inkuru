import { Feather } from '@expo/vector-icons';
import { ScrollView, Text, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppPressable } from '../../../components/AppPressable';
import { ChoiceRow } from '../../../components/ChoiceRow';
import { SettingSection } from '../../../components/SettingSection';
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
import { SHEET_MAX_HEIGHT } from '../../../theme/spacing';

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

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      entering={FadeIn.duration(120)}
      className="absolute inset-0 justify-end"
      style={{ zIndex: 50 }}
    >
      <AppPressable
        accessible={false}
        onPress={onClose}
        pressFeedback={false}
        className="absolute inset-0"
        style={{ backgroundColor: colors.scrim }}
      />
      <Animated.View
        entering={SlideInDown.duration(200)}
        className="rounded-t-2xl"
        style={{
          backgroundColor: colors.surface,
          maxHeight: SHEET_MAX_HEIGHT,
        }}
      >
          <View className="min-h-14 flex-row items-center justify-between px-4">
            <Text
              className="text-base font-semibold"
              style={{ color: colors.text }}
            >
              Lectura
            </Text>
            <AppPressable
              accessibilityLabel="Cerrar"
              onPress={onClose}
              className="min-h-12 min-w-12 items-center justify-center rounded-full"
            >
              <Feather name="x" size={20} color={colors.textMuted} />
            </AppPressable>
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
            contentContainerClassName="px-4"
          >
            <SettingSection
              title="Modo de lectura"
              groupRole="radiogroup"
              className="mt-2"
            >
              {READER_MODE_OPTIONS.map((option, index) => (
                <ChoiceRow
                  key={option.value}
                  label={option.label}
                  selected={mode === option.value}
                  divider={index > 0}
                  onPress={() => onSelectMode(option.value)}
                />
              ))}
            </SettingSection>
            {mode !== 'webtoon' ? (
              <SettingSection title="Escala de página" groupRole="radiogroup">
                {READER_SCALE_OPTIONS.map((option, index) => (
                  <ChoiceRow
                    key={option.value}
                    label={option.label}
                      selected={scale === option.value}
                    divider={index > 0}
                    onPress={() => onSelectScale(option.value)}
                  />
                ))}
              </SettingSection>
            ) : null}
            <SettingSection title="Calidad de imagen" groupRole="radiogroup">
              {READER_QUALITY_OPTIONS.map((option, index) => (
                <ChoiceRow
                  key={option.value}
                  label={option.label}
                  selected={quality === option.value}
                  divider={index > 0}
                  onPress={() => onSelectQuality(option.value)}
                />
              ))}
            </SettingSection>
          </ScrollView>
      </Animated.View>
    </Animated.View>
  );
}
