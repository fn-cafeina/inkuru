import { ScrollView, Text, View } from 'react-native';

function TagChip({ label }: { label: string }) {
  return (
    <View className="rounded-full bg-zinc-100 px-2.5 py-1 dark:bg-zinc-800">
      <Text className="text-xs text-zinc-600 dark:text-zinc-300">{label}</Text>
    </View>
  );
}

/** Single scrollable row; every tag stays reachable without measuring widths. */
export function TagRow({ tags }: { tags: string[] }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-1.5"
    >
      {tags.map((tag, index) => (
        <TagChip key={`${tag}-${index}`} label={tag} />
      ))}
    </ScrollView>
  );
}
