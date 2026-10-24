# Progress

Read this first, update it last. Newest notes at the top of each section.

## Status: milestone 3 (sync) built, waiting for a phone ↔ Mac test

Last session: 2026-10-24 (second session).

### Done

- **Sync, milestone 3 (built, not yet confirmed on the phone)**:
  - Mac receiver `mac/` (own package.json + bun.lock; dependency: `qrcode`): `server.ts` (`/status`, `/manifest`, `PUT|GET /files/*`, `POST /trash`, `/pair` page, localhost only), `config.ts` (token + port in `~/.config/memo-ry/receiver.json`; env `MEMORY_ROOT`, `MEMORY_PORT`, `MEMORY_CONFIG` for tests), `install.ts` (launchd agent, `--uninstall`). `mac/server.test.ts` covers auth, put/get/manifest/trash, sha mismatch, path traversal.
  - Phone `src/sync/`: `plan.ts` (pure three-way planner: upload/download/keep-both conflicts as `name (Mac).ext`, last-write-wins for project.json and sidecars, deletions become grouped Needs-you decisions, renames followed), `store.ts` (expo-sqlite: pairing, base state, hash cache, activity), `client.ts`, `engine.ts` (runs on launch, foreground, 4 s after a change, every 60 s while open).
  - Screens: `sync.tsx` rebuilt per 09-mac-sync (status, Device, Connection, Sync now, Pair again, Needs you Keep/Delete, Recent ↑/↓, Unpair), `pair.tsx` (expo-camera QR scan; also `/pair?code=`), Library footer and Mac-icon dot show live sync status. "Paste code instead" on the unpaired Mac screen.
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
  - `sync`: see the sync entry above.

### Next (in order)

1. **Confirm sync phone ↔ Mac** (the milestone's done-when). On the Mac: `cd mac && bun install && bun server.ts` (or `bun install.ts` to run at login), open `http://localhost:7337/pair`, then in Expo Go: Library → Mac icon → Pair with Mac → scan. Check: files appear in `~/Music/Memo-ry`; a file dropped into a song folder on the Mac shows up on the phone; deleting on either side shows a Needs-you card. macOS may ask to allow incoming connections for `bun`: allow it. Last session's test stopped before pairing (the phone was in use); the first deep-link attempt hit "Unmatched Route" for `/pair`, most likely a stale bundle (Metro hadn't logged an Android bundle yet). After force-stopping Expo Go a fresh bundle loaded, but pairing wasn't retried, so this is unconfirmed.
2. Milestone 2 leftovers: move items between folders, SQLite index (expo-sqlite) for Recent/Search, "New text file" in the Add sheet (mockup shows it; currently a "Lyrics" option), long-press menu on lyrics sections could also rename.
3. Polish (milestone 4): A–B loop region on the player, mini player while writing (needs a shared player outside screens), drafts UI for `lyrics.history/`, app icon/logo.
4. Before the APK: Android blocks plain HTTP in release builds. Add `expo-build-properties` with `android.usesCleartextTraffic: true` (Expo Go already allows it).

### Known issues / notes

- The iOS simulator's Expo Go is older than SDK 58 ("Project is incompatible"); test on the Android phone.
- Sync can replace `lyrics.md` while the lyrics editor is open; the editor keeps its in-memory copy and its next autosave uploads over the Mac's edit (only a `lyrics.history/` snapshot may keep it). Fine while lyrics are only edited on the phone; revisit if it bites.
- The receiver keeps its hash cache in memory: the first manifest after a restart re-hashes everything in `~/Music/Memo-ry`.
- **iOS build on this Mac**: the system CocoaPods (Ruby 2.6) crashes with `uninitialized constant ActiveSupport::LoggerThreadSafeLevel::Logger`. Workaround: prefix with `RUBYOPT="-rlogger"`, e.g. `RUBYOPT="-rlogger" bunx expo run:ios`. A permanent fix is `brew install cocoapods`.
- Imported audio has no peaks: tiles use a stable pseudo-waveform seeded by the file name.
- Video tiles show a glyph, not a poster frame.
- Search walks the whole library on each keystroke; fine for now, move to SQLite when it feels slow.
- `record.tsx` polls `recorder.getStatus()` every 80 ms instead of `useAudioRecorderState` (keeps the React Compiler lint rule happy and gives one level per tick).
