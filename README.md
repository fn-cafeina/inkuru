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
| `bun run check` | Run every `*.check.ts` self-check |
| `bun run release` | Bump, tag and push a release |

CI runs all of the above plus `expo-doctor` on every push and pull
request.

## Releases

Releases are cut from tags and built on GitHub Actions.

```bash
bun run release 1.0.1
```

The script refuses to run unless the working tree is clean, you are on
`main`, the version differs from the current one, both version files
agree and the tag `vX.Y.Z` does not exist yet. It then bumps `version`
in `app.json` and `package.json`, commits with `chore(release): vX.Y.Z`,
tags and pushes both. Add `--dry-run` to see the plan without touching
anything.

The release workflow runs the checks, fails unless the tag matches
both versions, builds a signed APK with `eas build --local`, and
publishes a GitHub Release with the APK attached. Notes are generated
from the commits since the previous tag. CI stays the quality gate: the
tag push runs it either way, so the script only guarantees the two
versions stay in sync.

Manual fallback: bump both files by hand, commit, tag `vX.Y.Z`, then
`git push origin main --follow-tags`.

Builds run on the GitHub runner and use no EAS build minutes. The
Android keystore is stored and managed by EAS, so the only secret the
workflow needs is the `EXPO_TOKEN` repository secret. The `production`
build profile in `eas.json` restricts the APK to the `arm64-v8a` and
`armeabi-v7a` architectures.

## Structure

- `src/screens/`: one folder per screen, `discover`, `library`,
  `manga`, `reader`
- `src/components/`: UI shared between screens
- `src/source/`: HTML parsers for the content source
- `src/downloads/`: download lifecycle, file management
- `src/storage/`: persistence, serialization, query cache
- `src/navigation/`, `src/hooks/`, `src/theme/`: tabs and stack
  navigation, shared hooks, colors

## Legal

Inkuru is an independent third-party client. It is not affiliated with,
endorsed by, or sponsored by any service or content provider it may access.

The app does not host, store, or distribute manga content. All content
belongs to its respective authors and rightsholders.

Users are responsible for the content they access through the app.

## License

MIT. See [LICENSE](LICENSE).