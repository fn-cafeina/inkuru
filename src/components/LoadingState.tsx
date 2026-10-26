import { ActivityIndicator, View } from 'react-native';

import { useColors } from '../theme/colors';

export function LoadingState() {
  const colors = useColors();

  return (
    <View className="flex-1 items-center justify-center">
      <ActivityIndicator size="large" color={colors.iconInactive} />
    </View>
  );
}
