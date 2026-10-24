# Memo-ry

A personal songwriting workspace for Android and iOS. Every song is a folder holding its lyrics, the melodies you hum, beats, references and any other file. It's all plain files, synced to a Mac over local Wi-Fi with Syncthing so FL Studio can open them directly. Offline, no account.

- Spec: [`docs/spec.md`](docs/spec.md)
- Progress / handoff: [`docs/progress.md`](docs/progress.md)
- Design: [`design/README.md`](design/README.md)

## Run

```bash
bun install
bun run ios        # or: bun run android (dev build; Expo Go won't work)
bun run typecheck && bun test && bun run lint
```
