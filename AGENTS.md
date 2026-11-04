## Stack

- Expo SDK 58, React Native 0.88, React 19.3, TypeScript 6 (strict)
- Package manager: bun. Use `bun add` and `bun expo install`, not npm.
- Styling: Tailwind CSS v4 through uniwind. No NativeWind, no StyleSheet.create.

## Commands

- `bun run android`: dev server targeting Android
- `bun run start`: dev server
- `bun run typecheck`: `tsc --noEmit`
- `bun run lint`: ESLint
- `bun run check:parser`: source parser self-check
- `bun run check:discover`: discover feed self-check
- `bun run check:reader`: chapter ranges and reader geometry self-check
- `bun run check:downloads`: download, storage and cache self-check
- `bun run check:release`: release script self-check
- `bun run release <version>`: bump, tag and push a release
- `npx expo-doctor@1.21.5`: dependency health check; CI runs it, run it
  after adding or upgrading dependencies

## Release

- Releases are cut from tags `v*.*.*` by `.github/workflows/release.yml`.
- `bun run release 1.0.1` requires a clean tree, branch `main`, a new
  version and a missing tag. It bumps `version` in `app.json` and
  `package.json`, commits `chore(release): vX.Y.Z`, tags and pushes.
  `--dry-run` prints the plan without touching anything.
- CI is the quality gate. The workflow fails unless the tag matches
  both version files, then builds the APK with a local EAS build and
  publishes a GitHub Release with it attached.
- Manual fallback: bump both files by hand, commit, tag `vX.Y.Z`, then
  `git push origin main --follow-tags`.

## Platform

- Android only. `app.json` has no `ios` or `web` blocks. Do not add iOS or
  web scripts, assets, or dependencies unless requested.
- Runs in Expo Go from Google Play (SDK 58).

## Styling

- Apply Tailwind classes through `className` on React Native components.
- CSS entry is `global.css` at the project root; Tailwind scans from the root.
  If `global.css` moves, add an explicit `@source`.
- Import `global.css` only from `App.tsx`, never from `index.ts` (breaks hot reload).
- Metro generates `uniwind-types.d.ts`. Do not edit it.
- In `metro.config.js`, `withUniwindConfig` must be the outermost wrapper.

## Structure

- No router. Entry `index.ts` renders `App.tsx`.
- Screens live in `src/screens/<screen>/`, with screen-private components in
  `components/` and pure helpers next to the screen.
- Shared UI lives in `src/components/`. Move a component there only when more
  than one screen uses it.
- `src/source/` holds the HTML parsers; `src/downloads/` the download
  lifecycle; `src/storage/` persistence and the query cache; `src/hooks/`
  shared hooks; `src/navigation/` the tabs and stack; `src/theme/` colors.
- Keep files under 300 lines (blank lines and comments excluded); ESLint
  enforces this with `max-lines`.

## Testing

- No test framework. Self-checks are plain scripts `*.check.ts` run directly
  with `bun <file>`, using hand-rolled `assert` that throws on failure.
- New non-trivial logic (parser, reducer, file handling, math) needs one
  `*.check.ts` next to the code, wired into its `check:*` script in
  `package.json`.
- Do not add `*.test.ts` files or a test runner; nothing executes them.
- Fixtures live in `__fixtures__/` next to their module.

## Lint

ESLint (`bun run lint`) enforces beyond `max-lines`: no `any`, no non-null
assertion (`!`), no floating promises, no misused promises, no `await` on
non-promises, no import cycles, `switch` exhaustiveness, `eqeqeq` smart,
`complexity` max 15, `max-depth` 4, `max-lines-per-function` 200,
exhaustive hook deps, no leaked falsy render, no unstable nested components.