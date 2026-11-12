import { Feather } from '@expo/vector-icons';
import { Text } from 'react-native';

import { AppPressable } from './AppPressable';
import { useColors } from '../theme/colors';

export function RefreshNotice({
  message,
  onRetry,
  className = 'mx-4 my-2',
}: {
  message: string;
  onRetry: () => void;
  className?: string;
}) {
  const colors = useColors();

  return (
    <AppPressable
      accessibilityLabel={`${message}. Reintentar`}
      onPress={onRetry}
      className={`${className} min-h-12 flex-row items-center rounded-full border border-zinc-200 px-4 dark:border-zinc-800`}
    >
      <Feather name="refresh-cw" size={16} color={colors.textMuted} />
      <Text
        accessibilityLiveRegion="polite"
        className="ml-2 flex-1 text-sm text-zinc-700 dark:text-zinc-300"
      >
        {message}
      </Text>
    </AppPressable>
  );
}
