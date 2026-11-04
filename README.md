# Inkuru

Android manga reader built with Expo SDK 58.

## Requirements

- Bun 1.4+
- Node.js LTS
- Expo Go (Google Play, SDK 58)

## Setup

```bash
bun install
bun run android
```

## Stack

- Expo SDK 58, React Native 0.88, TypeScript 6 (strict)
- Tailwind CSS v4 via [uniwind](https://docs.uniwind.dev/)

## Development

| Command | What it does |
|---|---|
| `bun run android` | Dev server targeting Android |
| `bun run start` | Dev server |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run lint` | ESLint via `expo lint` |
| `bun run check:parser` | Source HTML parser self-check |
| `bun run check:discover` | Discover feed self-check |
| `bun run check:reader` | Chapter ranges and reader geometry self-check |
| `bun run check:downloads` | Download, storage and cache self-check |

CI runs all of the above plus `expo-doctor` on every push and pull
request.

## Structure

- `src/screens/` — one folder per screen: `discover`, `library`,
  `manga`, `reader`
- `src/components/` — UI shared between screens
- `src/source/` — HTML parsers for the content source
- `src/downloads/` — download lifecycle, file management
- `src/storage/` — persistence, serialization, query cache
- `src/navigation/`, `src/hooks/`, `src/theme/` — tabs and stack
  navigation, shared hooks, colors

## Legal

Inkuru is an independent third-party client. It is not affiliated with,
endorsed by, or sponsored by any service or content provider it may access.

The app does not host, store, or distribute manga content. All content
belongs to its respective authors and rightsholders.

Users are responsible for the content they access through the app.
Support official releases.

## License

MIT. See [LICENSE](LICENSE).