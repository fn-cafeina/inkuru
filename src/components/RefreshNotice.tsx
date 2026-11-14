import { Feather } from '@expo/vector-icons';
import { Text } from 'react-native';

import { AnimatedPressable } from './AnimatedPressable';
import { useColors } from '../theme/colors';

export function RefreshNotice({
  message,
  onRetry,
  className = 'mx-5 my-2',
}: {
  message: string;
  onRetry: () => void;
  className?: string;
}) {
  const colors = useColors();

  return (
    <AnimatedPressable
      accessibilityLabel={`${message}. Reintentar`}
      onPress={onRetry}
      className={`${className} min-h-12 flex-row items-center rounded-xl border border-zinc-200 px-4 dark:border-neutral-800`}
    >
      <Feather name="refresh-cw" size={16} color={colors.textMuted} />
      <Text
        accessibilityLiveRegion="polite"
        className="ml-2 flex-1 text-sm text-zinc-700 dark:text-zinc-300"
      >
        {message}
      </Text>
    </AnimatedPressable>
  );
}
