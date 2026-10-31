import { ChoiceRow } from './ChoiceRow';
import { SettingSection } from './SettingSection';
import {
  READER_MODE_OPTIONS,
  READER_QUALITY_OPTIONS,
  READER_SCALE_OPTIONS,
} from '../storage/readerSettings';
import type {
  ReaderMode,
  ReaderQuality,
  ReaderScale,
} from '../storage/readerSettings';

/** Reader mode, scale and quality rows shared by Settings and the sheet. */
export function ReaderPreferenceSections({
  mode,
  scale,
  quality,
  firstSectionClassName,
  onSelectMode,
  onSelectScale,
  onSelectQuality,
}: {
  mode: ReaderMode;
  scale: ReaderScale;
  quality: ReaderQuality;
  firstSectionClassName?: string;
  onSelectMode: (mode: ReaderMode) => void;
  onSelectScale: (scale: ReaderScale) => void;
  onSelectQuality: (quality: ReaderQuality) => void;
}) {
  return (
    <>
      <SettingSection
        title="Modo de lectura"
        groupRole="radiogroup"
        className={firstSectionClassName}
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
      <SettingSection title="Escala de página" groupRole="radiogroup">
        {READER_SCALE_OPTIONS.map((option, index) => (
          <ChoiceRow
            key={option.value}
            label={option.label}
            selected={scale === option.value}
            divider={index > 0}
            disabled={mode === 'webtoon'}
            onPress={() => onSelectScale(option.value)}
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
            onPress={() => onSelectQuality(option.value)}
          />
        ))}
      </SettingSection>
    </>
  );
}
