import { Text, View } from 'react-native';

export function ReaderProgressBar({
  page,
  total,
  bottomInset,
}: {
  page: number;
  total: number;
  bottomInset: number;
}) {
  if (total <= 0) {
    return null;
  }

  return (
    <View
      pointerEvents="none"
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Progreso de lectura"
      accessibilityValue={{ min: 1, max: total, now: page + 1 }}
      className="absolute left-4 right-4"
      style={{ bottom: bottomInset + 8 }}
    >
      <View
        className="flex-row items-center rounded-full px-3 py-2"
        style={{ backgroundColor: 'rgba(9, 9, 11, 0.7)' }}
      >
        <View
          className="h-0.5 flex-1 overflow-hidden rounded-full"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.25)' }}
        >
          <View
            className="h-full rounded-full"
            style={{
              width: `${((page + 1) / total) * 100}%`,
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
            }}
          />
        </View>
        <Text className="ml-3 text-xs font-semibold text-white">
          {page + 1} / {total}
        </Text>
      </View>
    </View>
  );
}
