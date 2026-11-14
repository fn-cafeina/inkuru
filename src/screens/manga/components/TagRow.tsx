import { ScrollView, Text, View } from 'react-native';

function TagChip({ label }: { label: string }) {
  return (
    <View className="rounded-md bg-white/10 px-2.5 py-1">
      <Text className="text-[10px] font-bold uppercase tracking-wider text-white/80">
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
