import { ScrollView, Text, View } from 'react-native';

function TagChip({ label }: { label: string }) {
  return (
    <View className="rounded-md bg-zinc-100 px-2.5 py-1 dark:bg-white/10">
      <Text className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 dark:text-white/80">
        {label}
      </Text>
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
