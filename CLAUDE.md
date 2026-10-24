# Memo-ry

Personal, offline songwriting workspace: a dark file explorer where each song is a folder holding lyrics, recordings and any files, synced to a Mac with Syncthing. One user.

## Start here (handoff)

1. `docs/progress.md`: what's done, what's next, known issues. **Update it at the end of every session.**
2. `docs/spec.md`: product spec, data model, file formats. Source of truth for behaviour. When you change behaviour (data model, file formats, sync), update the matching section.
3. `design/README.md` + `design/screens/*.html`: approved mockups. Source of truth for look; take exact values from the HTML.
4. `AGENTS.md`: Expo rules (SDK changes, docs to fetch). Read before touching Expo APIs.

## Decisions already made (don't reopen)

- No tags anywhere. No share-sheet import. No AI in v1.
- Dark, minimal explorer look (Geist + Geist Mono). Not Focus Protocol's card style.
- Files on disk are the source of truth; SQLite is only an index.
- Mock/sample data in the app, seeds and screenshots: Kendrick Lamar album/song titles as folder names, lyrics as `[ verse 1 lyrics ]` placeholders. Never commit real copyrighted lyrics.

## Package manager: Bun, always

- `bun install`, `bun add`, `bun run`, `bunx`; never npm/npx/yarn/pnpm.
- Expo packages: `bunx expo install <pkg>`.
- Commit `bun.lock` only.

## Stack

- Expo SDK 58, TypeScript strict, expo-router (routes in `src/app/`).
- expo-audio, expo-file-system (new `File`/`Directory`/`Paths` API, not `/legacy`), expo-sqlite, expo-document-picker, expo-image-picker, react-native-svg, Geist fonts via `@expo-google-fonts/*`.
- **Develop in Expo Go** (`bunx expo start --go`; the phone is on the same Wi-Fi, Expo Go 58). Only use modules bundled in Expo Go. No native/dev builds until the app is feature-complete (user's call); then build an APK.

## Code layout

- `src/app/`: screens only.
- `src/ui/`: tokens + small UI kit (Text, Tile, icons, Waveform, Sheet...). Screens compose only these.
- `src/library/`: everything that touches the library folder (paths, listing, project.json, sidecars, lyrics.md read/write, recordings, imports). UI never calls expo-file-system directly.
- `src/lyrics/`: lyrics.md parse/serialise (pure, unit-tested with `bun test`).

## Checks before calling anything done

- `bunx tsc --noEmit` and `bun test` pass; `bunx expo lint` clean.
- Built screens compared against `design/screens/` via a simulator screenshot.

## Working style

- One milestone at a time (see `docs/spec.md` Milestones); stop and summarise when one is done.
- Small, clear commits. Standard Expo/Software Mansion packages are fine to add; ask before unusual or heavy ones.
