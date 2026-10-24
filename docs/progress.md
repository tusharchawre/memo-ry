# Progress

Read this first, update it last. Newest notes at the top of each section.

## Status: milestone 1 (spike) built, needs on-device testing

Last session: 2026-10-24.

### Done

- Project: Expo SDK 58, TypeScript strict, expo-router, bun. Dev client. App id `com.tushar.memory`.
- Docs: `docs/spec.md` (product + data model), `design/` (approved mockups as HTML), `CLAUDE.md` (rules).
- Library layer (`src/library/library.ts`): library root at `Documents/Memo-ry`, Inbox, listing (recordings/ and files/ shown flat, sidecars and project.json hidden), create/rename/delete, `project.json` status, lyrics.md read/write with `lyrics.history/` snapshots (every 10 min), save recording + sidecar (title, note, linkedSection, durationSec, createdAt, peaks), import files, recent files, search (walk, no index yet), library stats.
- Pure helpers with tests (`bun test`): `src/lyrics/lyrics.ts` (lyrics.md parse/serialise), `src/library/names.ts` (kinds, names, peaks, durations).
- Dev-only sample library (`src/library/seed.ts`): mock data from the design, created when the library is just an empty Inbox.
- Screens (`src/app/`):
  - `index` Library: folders grid, recent files, search entry, Mac icon, new folder.
  - `folder` Folder: status chip (tap cycles), filter tabs, tile grid with thumbnails, long-press rename/delete, Add sheet (Record, From Files, Photos & videos, Lyrics, New folder inside), bottom bar Add · Record · Write.
  - `lyrics` editor: title, sections, notes, "+ section", section menu (move up/down, delete), linked recording shown next to its section label, debounced autosave.
  - `record`: permission, metering waveform, timer, pause/resume, discard; Save sheet with preview playback, name, note, Goes with, path preview.
  - `player`: waveform seek (tap), −5/+5, play/pause, whole-file loop, speed cycle, info rows.
  - `search`: names, lyrics, notes with highlight and tabs.
  - `sync`: basic (library location, size, setup steps).

### Next (in order)

1. Run on the iOS simulator and an Android phone; screenshot each screen and compare with `design/screens/`; fix gaps.
2. **Spike check (needs the user):** Syncthing phone → Mac on the home Wi-Fi.
3. **Android library location**: let the user pick `Music/Memo-ry` with `Directory.pickDirectoryAsync` (SAF) so Syncthing-Fork can see it; persist the URI; confirm read/write + expo-audio playback on SAF URIs (spec "Library location and sync"). Right now the library is in app-private Documents, which Syncthing on Android can't reach.
4. Milestone 2 leftovers: move items between folders, SQLite index (expo-sqlite) for Recent/Search, "New text file" in the Add sheet (mockup shows it; currently a "Lyrics" option), long-press menu on lyrics sections could also rename.
5. Milestone 3: A–B loop region on the player, mini player while writing (needs a shared player outside screens), drafts UI for `lyrics.history/`, full Mac sync screen (Syncthing status, Needs you, activity), app icon/logo.

### Known issues / notes

- **iOS build on this Mac**: the system CocoaPods (Ruby 2.6) crashes with `uninitialized constant ActiveSupport::LoggerThreadSafeLevel::Logger`. Workaround: prefix with `RUBYOPT="-rlogger"`, e.g. `RUBYOPT="-rlogger" bunx expo run:ios`. A permanent fix is `brew install cocoapods`.
- Nothing is committed yet beyond the template's initial commit (the user hasn't asked for commits).
- Imported audio has no peaks: tiles use a stable pseudo-waveform seeded by the file name.
- Video tiles show a glyph, not a poster frame.
- Search walks the whole library on each keystroke; fine for now, move to SQLite when it feels slow.
- `record.tsx` polls `recorder.getStatus()` every 80 ms instead of `useAudioRecorderState` (keeps the React Compiler lint rule happy and gives one level per tick).
