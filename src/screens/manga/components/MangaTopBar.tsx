import { Feather } from '@expo/vector-icons';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useColors } from '@/theme/colors';

type Props = {
  onBack: () => void;
  /** False while the detail is still loading and there is nothing to save. */
  canToggleLibrary: boolean;
  inLibrary: boolean;
  onToggleLibrary: () => void;
};

/** Back + bookmark row; scrolls away with the hero, like rokimu. */
export function MangaTopBar({
  onBack,
  canToggleLibrary,
  inLibrary,
  onToggleLibrary,
}: Props) {
  const colors = useColors();

  return (
    <ScreenHeader
      onBack={onBack}
      action={
        <AnimatedPressable
          accessibilityLabel={
            inLibrary
              ? 'Quitar de la biblioteca'
              : 'Añadir a la biblioteca'
          }
          accessibilityState={{ selected: inLibrary, disabled: !canToggleLibrary }}
          disabled={!canToggleLibrary}
          onPress={onToggleLibrary}
          className="min-h-12 min-w-12 items-center justify-center rounded-full"
        >
          <Feather
            name="bookmark"
            size={20}
            color={
              inLibrary
                ? colors.accent
                : canToggleLibrary
                  ? colors.iconInactive
                  : colors.border
            }
          />
        </AnimatedPressable>
      }
    />
  );
}
