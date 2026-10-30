import { useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { Text, View } from 'react-native';

// gap-1.5 between chips; must match the Tailwind class on the rows below.
const TAG_ROW_GAP = 6;

function TagChip({
  label,
  onLayout,
}: {
  label: string;
  onLayout?: (event: LayoutChangeEvent) => void;
}) {
  return (
    <View
      onLayout={onLayout}
      className="rounded-lg bg-zinc-100 px-2.5 py-1 dark:bg-zinc-800"
    >
      <Text className="text-xs text-zinc-600 dark:text-zinc-300">{label}</Text>
    </View>
  );
}

/** Two rows max; tags after the second row collapse into +N. */
export function TagRow({ tags }: { tags: string[] }) {
  const [available, setAvailable] = useState(0);
  const [widths, setWidths] = useState<Record<number, number>>({});
  const record = (index: number, width: number) =>
    setWidths((current) =>
      current[index] === width ? current : { ...current, [index]: width },
    );

  const overflowWidth = widths[tags.length];
  const rows =
    available > 0 &&
    overflowWidth !== undefined &&
    tags.every((_, index) => widths[index] !== undefined)
      ? layoutTagRows(tags.length, widths, available, overflowWidth)
      : null;

  return (
    <View
      onLayout={(event) => setAvailable(event.nativeEvent.layout.width)}
      className="gap-1.5"
    >
      {rows ? (
        <>
          {rows.first.length > 0 ? (
            <View className="flex-row gap-1.5 overflow-hidden">
              {rows.first.map((index) => {
                const tag = tags[index];

                return tag === undefined ? null : (
                  <TagChip key={`${tag}-${index}`} label={tag} />
                );
              })}
            </View>
          ) : null}
          {rows.second.length > 0 || rows.hidden > 0 ? (
            <View className="flex-row gap-1.5 overflow-hidden">
              {rows.second.map((index) => {
                const tag = tags[index];

                return tag === undefined ? null : (
                  <TagChip key={`${tag}-${index}`} label={tag} />
                );
              })}
              {rows.hidden > 0 ? <TagChip label={`+${rows.hidden}`} /> : null}
            </View>
          ) : null}
        </>
      ) : (
        <View className="flex-row gap-1.5 overflow-hidden">
          {tags.map((tag, index) => (
            <TagChip
              key={`${tag}-${index}`}
              label={tag}
              onLayout={(event) =>
                record(index, event.nativeEvent.layout.width)
              }
            />
          ))}
          {/* Probe wide enough for the largest possible hidden count. */}
          <TagChip
            label={`+${tags.length}`}
            onLayout={(event) =>
              record(tags.length, event.nativeEvent.layout.width)
            }
          />
        </View>
      )}
    </View>
  );
}

function layoutTagRows(
  count: number,
  widths: Record<number, number>,
  available: number,
  overflowWidth: number,
) {
  const indices = (from: number, length: number) =>
    Array.from({ length }, (_, offset) => from + offset);
  const widthAt = (index: number) => widths[index] ?? 0;

  let firstCount = 0;
  let used = 0;

  while (firstCount < count) {
    const next = used + (firstCount > 0 ? TAG_ROW_GAP : 0) + widthAt(firstCount);

    if (next > available) {
      break;
    }

    used = next;
    firstCount += 1;
  }

  if (firstCount === count) {
    return { first: indices(0, count), second: [], hidden: 0 };
  }

  let secondCount = 0;
  used = 0;

  while (firstCount + secondCount < count) {
    const index = firstCount + secondCount;
    const next =
      used + (secondCount > 0 ? TAG_ROW_GAP : 0) + widthAt(index);

    if (next > available) {
      break;
    }

    used = next;
    secondCount += 1;
  }

  if (firstCount + secondCount === count) {
    return {
      first: indices(0, firstCount),
      second: indices(firstCount, secondCount),
      hidden: 0,
    };
  }

  // The second row must also fit the +N chip.
  secondCount = 0;
  used = 0;

  while (firstCount + secondCount < count) {
    const index = firstCount + secondCount;
    const next =
      used +
      (secondCount > 0 ? TAG_ROW_GAP : 0) +
      widthAt(index) +
      TAG_ROW_GAP +
      overflowWidth;

    if (next > available) {
      break;
    }

    used += (secondCount > 0 ? TAG_ROW_GAP : 0) + widthAt(index);
    secondCount += 1;
  }

  return {
    first: indices(0, firstCount),
    second: indices(firstCount, secondCount),
    hidden: count - firstCount - secondCount,
  };
}
