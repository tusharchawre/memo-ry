# Memo-ry: spec (v1)

A personal songwriting workspace. Each song lives in its own folder with its lyrics, the melodies I hum, beats, reference images, videos and any other file. The library is plain files on disk, and Memo-ry itself syncs it to my Mac over local Wi-Fi (via a small receiver program on the Mac) so FL Studio can open them directly.

This file is the source of truth for **behaviour**. The approved mockups (`design/`) are the source of truth for **look**.

## Problem

My music work is scattered: lyrics in Google Docs, melody voice notes in WhatsApp "Message yourself", ideas in a notebook and phone notes. Nothing is grouped by song, things get buried, and files don't reach the Mac where I produce.

## Users and devices

Just me: an Android phone (primary; Focus Protocol already ships to it as an APK) and an M4 MacBook Air. iOS should keep working (it's the dev simulator), but Android is the target device.

## Goals

- A simple file explorer for music: folders → songs → files, shown as tiles with content thumbnails.
- A plain lyric-writing page per song.
- Record a melody from inside a song folder; it lands in that folder.
- Attach any file type: audio, images, video, MIDI, text, PDF, anything else as-is.
- Files appear on the Mac automatically over local Wi-Fi as plain files, with no third-party sync app: Memo-ry syncs by itself to a small receiver on the Mac.
- Fully offline. No cloud, no account, no analytics.

## Non-goals (v1)

- **No tags anywhere** (dropped by decision: I won't use them).
- **No share-sheet import** (e.g. from WhatsApp): dropped. Import goes through the app's own Add sheet.
- No AI (transcription, rhyme help, semantic search): v2.
- No sharing or collaboration, no cloud backup, no in-app audio editing.
- Not a lock-screen quick-capture tool.
- No third-party sync apps (Syncthing etc.): sync is built in.

## Screens (see `design/README.md` for the mockup of each)

1. **Library**: the library root. Search field (opens Search), a **Folders** grid (Inbox first, then folders by most recent), a **Recent files** row (last 3 files touched anywhere), a sync status line at the bottom, a Mac icon (opens Mac sync) and a + button (new folder).
2. **Folder**: breadcrumb back to the parent, title, status chip (Idea / Writing / Producing / Done; tap to change), filter tabs **All · Lyrics · Audio · Files** with an item count, then a 3-column grid of tiles. Subfolders show as folder tiles. Bottom bar: **Add** · **Record** (big red button) · **Write** (opens lyrics.md, creating it if missing). Long-press a tile: rename, move, delete.
3. **Lyrics** (`lyrics.md`): a plain black page with white text. The song title, then sections (Intro / Verse / Hook / Bridge / Outro, numbered when repeated) as small grey mono labels with free text under each. An optional note line per section (grey). A section that has a linked recording shows its file name next to the label; tap to play. "+ section" at the bottom. Autosaves. A mini player docks at the bottom while audio is playing (keeps playing while you write; loop region shown).
4. **Recording**: "Recording into <folder>", REC dot, large timer, live waveform (from metering), Discard · Stop · Pause. Stop opens Save.
5. **Save recording** (bottom sheet): play-back preview, Name, Note, **Goes with** (None + the song's sections), the path it will be saved to, Save / Discard.
6. **Player**: file name, title, folder + date, a large waveform with a draggable loop region (A–B), playhead, times, controls: loop · −5 · play/pause · +5 · speed (0.5×–2×). Below: Note, Goes with (opens lyrics), File (type · size), Folder.
7. **Add to folder** (bottom sheet): Record, From Files (any type, multi-select), Photos & videos, New text file, New folder inside, Cancel.
8. **Search**: query field + Cancel, tabs **All · Lyrics · Audio · Files · Folders** with counts, results as rows (small thumbnail, name, matched snippet with the term highlighted, folder path). Searches names, lyrics text, notes (recording notes and lyric notes).
9. **Mac sync**: "Pair with Mac" (QR scan) when unpaired. When paired: status (Up to date / Syncing / Can't reach Mac + last synced), Mac name, the Mac folder path, library size, "Sync now", a **Needs you** list (e.g. "X was deleted on the Mac. Delete it here too?" Keep / Delete) and a recent activity list (↑ sent / ↓ from Mac). See "Library location and sync".

## File tiles and thumbnails

Every file tile is a rounded square + the name under it, with a small extension badge (`m4a`, `jpg`…) in the corner. The square shows a thumbnail of the content:

- **Image**: the image itself (cover-cropped). **Video**: a poster frame.
- **Audio**: a waveform + duration. Peaks come from the recording's sidecar (`peaks`, saved while recording via metering). For imported audio with no peaks, draw a stable pseudo-waveform seeded from the file name (real decoding is a later improvement).
- **lyrics.md / text**: the first lines of text in tiny type with section labels.
- **MIDI**: a small piano-roll glyph. **PDF**: a light page with the first lines/title. **Other**: a generic file glyph.
- **Folder**: a folder glyph + item count; Inbox uses a tray glyph.

## Data model: files are the source of truth

The Mac needs no app: everything is plain files.

```
Memo-ry/                          ← library root
  Inbox/
  good kid, m.A.A.d city/         ← any folder can contain folders (an album/EP)
    project.json                  ← optional
    Money Trees/
      project.json
      lyrics.md
      lyrics.history/
        2026-10-24T22-10-00.md
      recordings/
        2026-10-24 hook melody.m4a
        2026-10-24 hook melody.json
      files/
        reference.mp3
        cover.jpg
```

- Folder names are the display names (sanitise `/ \ : * ? " < > |`; on a clash, append ` 2`, ` 3`…).
- `project.json` (optional, any folder):
  ```json
  { "status": "writing", "createdAt": "2026-10-24T22:00:00+05:30" }
  ```
  `status` ∈ `idea | writing | producing | done`. No status = plain folder (no chip).
- Recording sidecar `<same name>.json`:
  ```json
  {
    "title": "hook melody",
    "note": "slow, minor",
    "linkedSection": "hook",
    "durationSec": 9,
    "createdAt": "2026-10-24T02:58:00+05:30",
    "peaks": [0.12, 0.4, 0.82]
  }
  ```
  `peaks`: ~64 values 0–1. `linkedSection`: the section id (see lyrics format), or null.
- New recordings: `recordings/YYYY-MM-DD <title>.m4a` (AAC). Imported files: `files/<original name>`.
- The UI flattens `recordings/` and `files/` into the folder grid; the filter tabs split them by kind. Other subfolders show as folders.
- Sidecar `.json` files and `project.json` are hidden in the UI.

### lyrics.md format

```
# Money Trees

## Verse 1
first line
second line

> 72 bpm, half-spoken, dry vocal.

## Hook
...
```

- `# ` line = song title (defaults to the folder name).
- `## ` heading = a section. Section id = heading lowercased, spaces → `-` (`Verse 1` → `verse-1`). Allowed base names: Intro, Verse, Pre-hook, Hook, Bridge, Outro (free text allowed too).
- Lines starting with `> ` inside a section = that section's note.
- Must round-trip: parse → edit → serialise gives the same file when nothing changed. Any text the parser doesn't understand is kept as-is.
- **History**: before overwriting `lyrics.md`, copy the previous version to `lyrics.history/<ISO time>.md` if the last snapshot is older than 10 minutes. Drafts UI (browse + restore) is milestone 3.

### Index

A local SQLite index (expo-sqlite) for fast Recent / Search, rebuilt from files on launch and after changes. Files win on any disagreement; deleting the index loses nothing.

## Library location and sync

**Decision (2026-10-24): no third-party sync apps** (no Syncthing, no Möbius). Memo-ry is the only app on the phone. Sync is built into Memo-ry, plus one small receiver program on the Mac.

- **Library location**: app storage, `Documents/Memo-ry` (expo-file-system `Paths.document`). No shared-folder picker needed, because the app does its own sync. On iOS also expose it in the Files app (`UIFileSharingEnabled`, `LSSupportsOpeningDocumentsInPlace`).
- **Mac receiver** (`mac/` in this repo, run with Bun): a headless HTTP server on the local network that writes into `~/Music/Memo-ry` and serves files back. Starts at login via a launchd agent (`bun mac/install.ts` sets it up). A menu-bar app is a later nicety, not v1.
- **Pairing (once)**: the receiver prints a QR code (terminal, plus a page at `http://localhost:<port>/pair`) holding `{host, port, token}`. Memo-ry's Mac screen has "Pair with Mac", which scans it (expo-camera barcode scanning, works in Expo Go) and stores host, port and token. Every request carries `Authorization: Bearer <token>`; anything else gets a 401. If the Mac's IP changes, the phone shows "Can't reach Mac" with a "Pair again" button. Bonjour discovery is a later improvement (it needs a native module).
- **When it syncs**: on app open, when returning to the foreground, and a few seconds after any library change, but only while the Mac is reachable. A "Sync now" button sits on the Mac screen. Background sync while the app is closed comes later (expo-background-task, native build).
- **Protocol** (HTTP, JSON; paths are library-relative, URL-encoded):
  - `GET /manifest` → `[{ path, size, mtime, sha256 }]` for every file under `~/Music/Memo-ry` (skips `.trash/` and dotfiles).
  - `PUT /files/<path>` with the raw bytes and headers `X-Mtime`, `X-Sha256` → writes atomically (temp file + rename) and sets mtime.
  - `GET /files/<path>` → the bytes.
  - `POST /trash` `{ path }` → moves the file to `~/Music/Memo-ry/.trash/<date>/<path>` (recoverable; never a hard delete).
  - `GET /status` → `{ ok, name, version, freeBytes }` (used for "reachable?" and the Mac screen).
- **Sync engine (phone)**: keeps a sync state table in expo-sqlite: `path → { sha256, size, mtime }` as of the last successful sync on both sides. Each run compares the phone's files, the Mac's manifest and that state:
  - Changed or new only on the phone → upload. Only on the Mac → download (e.g. an FL Studio bounce dropped into the song folder).
  - Changed on both sides, different content → keep both: the Mac's copy is downloaded as `<name> (Mac).<ext>`. Exception: metadata JSON (`project.json`, sidecars) is last-write-wins by mtime.
  - Deleted on one side → **never applied automatically**. It goes to the "Needs you" list on the Mac screen ("X was deleted on the Mac. Delete it here too?" Keep / Delete). Keep = copy it back; Delete = remove it here (phone side), or `POST /trash` (Mac side).
  - Hash with expo-crypto or `File.digest('sha256')` (in expo-file-system); cache by size+mtime so unchanged files aren't re-hashed.
- **Mac screen** shows: Up to date / Syncing (n of m) / Can't reach Mac, last synced time, Mac name, `~/Music/Memo-ry`, library size, the Needs-you list and a recent activity list (↑ sent / ↓ from Mac).

## Look (summary; exact values in `design/`)

Dark, minimal file explorer. Background `#000000`, tiles `#161616`, sheet `#111111`, inputs `#1C1C1E`, hairlines `#1F1F1F`, text `#F5F5F5`, secondary `#C7C7CC`, muted `#8E8E93`, record red `#FF5A52`, synced green `#2F9E5B`, "Writing" dot `#A78BFA`. Fonts: Geist (UI), Geist Mono (file names, sizes, durations, paths, section labels). Touch targets ≥ 44 px. No cards-with-borders, no emoji, no gradients.

## Tech stack

- Expo SDK 58 + TypeScript (strict) + expo-router; **bun** for everything.
- `expo-audio` (record with metering + playback, loop, rate), `expo-file-system` (new `File` / `Directory` / `Paths` API), `expo-document-picker`, `expo-image-picker`, `expo-sqlite`, `react-native-svg`, `@expo-google-fonts/geist` + `geist-mono`.
- Develop in Expo Go; native builds (APK via EAS, like Focus Protocol) only once features are complete.
- Mac receiver: Bun + TypeScript, no dependencies beyond Bun's built-ins (+ a QR printer).

## Milestones

1. **Spike** (done): create a folder, write lyrics, record a memo into it, play it back.
2. **v1 core**: Library + folder browsing with thumbnails, filter tabs, status, Add sheet (files, photos, new text file, new folder), rename/move/delete, recording metadata, lyrics sections + notes, SQLite index + Search.
3. **Sync**: Mac receiver (`mac/`), pairing, sync engine, Mac sync screen. Confirm phone ↔ Mac on my Wi-Fi.
4. **v1 polish**: A–B loop on the player, mini player while writing, lyric drafts (history) UI, app icon.
5. **Daily use for 2 weeks**, then decide v2.

Progress is tracked in `docs/progress.md`.

## v2 ideas

Local transcription (Whisper), rhyme/syllable help, search by meaning, BPM/key detection, album/EP overview.

## Done when (v1)

- Every song I'm working on has its own folder with lyrics, recordings and files together.
- All lyrics from Google Docs and memos from WhatsApp are migrated in.
- New files appear in a Finder folder on the Mac without me doing anything.
- I've written lyrics and saved melodies in it for two weeks instead of Docs/WhatsApp.
