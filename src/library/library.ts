// Everything that touches the library folder. Files are the source of truth (docs/spec.md "Data model").
// Paths here are library-relative, '/'-separated; '' is the library root. UI never calls expo-file-system directly.
import { Directory, File, Paths } from 'expo-file-system';

import { parseLyrics, serializeLyrics, type Lyrics } from '@/lyrics/lyrics';

import { notifyLibraryChanged } from './events';
import { dateStamp, kindOf, localIso, sanitizeName, splitExt, uniqueName, displayTitle, type Kind } from './names';

export const INBOX = 'Inbox';
const LIBRARY_DIR = 'Memo-ry';
const PROJECT_FILE = 'project.json';
const LYRICS_FILE = 'lyrics.md';
const HISTORY_DIR = 'lyrics.history';
const RECORDINGS_DIR = 'recordings';
const FILES_DIR = 'files';
/** Folders whose contents are shown flat in their parent's grid. */
const FLAT_DIRS = new Set([RECORDINGS_DIR, FILES_DIR]);
const HISTORY_GAP_MS = 10 * 60 * 1000;

export type Status = 'idea' | 'writing' | 'producing' | 'done';
export const STATUSES: Status[] = ['idea', 'writing', 'producing', 'done'];

export type ProjectMeta = { status?: Status; createdAt?: string };

export type RecordingMeta = {
  title: string;
  note: string;
  linkedSection: string | null;
  durationSec: number;
  createdAt: string;
  peaks?: number[];
};

export type Item = {
  kind: Kind;
  /** File or folder name on disk. */
  name: string;
  /** Name shown on the tile. */
  title: string;
  ext: string;
  path: string;
  uri: string;
  modified: number;
  size: number;
  count?: number;
  status?: Status;
  isInbox?: boolean;
  recording?: RecordingMeta;
  preview?: string;
};

// ---------- paths ----------

export function segments(path: string): string[] {
  return path ? path.split('/').filter(Boolean) : [];
}

export function joinPath(...parts: string[]): string {
  return parts.flatMap(segments).join('/');
}

export function parentPath(path: string): string {
  return segments(path).slice(0, -1).join('/');
}

export function baseName(path: string): string {
  return segments(path).at(-1) ?? '';
}

function root(): Directory {
  return new Directory(Paths.document, LIBRARY_DIR);
}

function dirAt(path: string): Directory {
  const parts = segments(path);
  return parts.length ? new Directory(root(), ...parts) : root();
}

function fileAt(path: string): File {
  return new File(root(), ...segments(path));
}

function ensureDir(dir: Directory): Directory {
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

function readJson<T>(file: File): T | null {
  try {
    return file.exists ? (JSON.parse(file.textSync()) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(file: File, value: unknown) {
  if (!file.exists) file.create({ intermediates: true });
  file.write(`${JSON.stringify(value, null, 2)}\n`);
}

export function folderTitle(path: string): string {
  return path ? baseName(path) : 'Library';
}

// ---------- setup ----------

export function ensureLibrary() {
  ensureDir(root());
  ensureDir(dirAt(INBOX));
}

/** Where the library lives on this device, for the sync screen. */
export function libraryUri(): string {
  return root().uri;
}

// ---------- listing ----------

function isSidecar(name: string, siblings: Set<string>): boolean {
  const { base, ext } = splitExt(name);
  if (ext !== 'json') return false;
  for (const s of siblings) if (s !== name && splitExt(s).base === base) return true;
  return false;
}

function fileItem(file: File, path: string, siblings: Set<string>): Item {
  const name = file.name;
  const kind = kindOf(name);
  const { ext } = splitExt(name);
  const item: Item = {
    kind,
    name,
    title: kind === 'lyrics' ? 'lyrics' : displayTitle(name),
    ext,
    path,
    uri: file.uri,
    modified: file.modificationTime ?? 0,
    size: file.size ?? 0,
  };
  if (kind === 'audio') {
    const base = splitExt(name).base;
    const sidecarName = [...siblings].find((s) => s === `${base}.json`);
    if (sidecarName) {
      const meta = readJson<RecordingMeta>(new File(file.parentDirectory, sidecarName));
      if (meta) {
        item.recording = meta;
        if (meta.title) item.title = meta.title;
      }
    }
  }
  if (kind === 'lyrics' || kind === 'text') {
    try {
      item.preview = file.textSync().slice(0, 400);
    } catch {
      item.preview = '';
    }
  }
  return item;
}

function visibleEntries(dir: Directory, path: string): { folders: Directory[]; files: { file: File; path: string; siblings: Set<string> }[] } {
  const folders: Directory[] = [];
  const files: { file: File; path: string; siblings: Set<string> }[] = [];
  const collectFiles = (d: Directory, dPath: string, entries: (Directory | File)[]) => {
    const names = new Set(entries.map((e) => e.name));
    for (const e of entries) {
      if (!(e instanceof File)) continue;
      if (e.name.startsWith('.') || e.name === PROJECT_FILE || isSidecar(e.name, names)) continue;
      files.push({ file: e, path: joinPath(dPath, e.name), siblings: names });
    }
  };
  const entries = dir.list();
  collectFiles(dir, path, entries);
  for (const e of entries) {
    if (!(e instanceof Directory) || e.name.startsWith('.') || e.name === HISTORY_DIR) continue;
    if (FLAT_DIRS.has(e.name)) collectFiles(e, joinPath(path, e.name), e.list());
    else folders.push(e);
  }
  return { folders, files };
}

function folderItem(dir: Directory, path: string): Item {
  const meta = readJson<ProjectMeta>(new File(dir, PROJECT_FILE));
  const { folders, files } = visibleEntries(dir, path);
  return {
    kind: 'folder',
    name: dir.name,
    title: dir.name,
    ext: '',
    path,
    uri: dir.uri,
    modified: dir.info().modificationTime ?? 0,
    size: 0,
    count: folders.length + files.length,
    status: meta?.status,
    isInbox: path === INBOX,
  };
}

export type FolderListing = { exists: boolean; folders: Item[]; files: Item[]; meta: ProjectMeta };

export function listFolder(path: string): FolderListing {
  const dir = dirAt(path);
  if (!dir.exists) return { exists: false, folders: [], files: [], meta: {} };
  const { folders, files } = visibleEntries(dir, path);
  const folderItems = folders
    .map((d) => folderItem(d, joinPath(path, d.name)))
    .sort((a, b) => Number(!!b.isInbox) - Number(!!a.isInbox) || b.modified - a.modified);
  const fileItems = files
    .map((f) => fileItem(f.file, f.path, f.siblings))
    .sort((a, b) => Number(b.kind === 'lyrics') - Number(a.kind === 'lyrics') || b.modified - a.modified);
  const meta = readJson<ProjectMeta>(new File(dir, PROJECT_FILE)) ?? {};
  return { exists: true, folders: folderItems, files: fileItems, meta };
}

/** Most recently changed files anywhere in the library. */
export function recentFiles(limit = 3): Item[] {
  const out: Item[] = [];
  const walk = (path: string, depth: number) => {
    const dir = dirAt(path);
    if (!dir.exists) return;
    const { folders, files } = visibleEntries(dir, path);
    for (const f of files) out.push(fileItem(f.file, f.path, f.siblings));
    if (depth < 5) for (const d of folders) walk(joinPath(path, d.name), depth + 1);
  };
  walk('', 0);
  return out.sort((a, b) => b.modified - a.modified).slice(0, limit);
}

export function getItem(path: string): Item | null {
  const file = fileAt(path);
  if (!file.exists) return null;
  const names = new Set(file.parentDirectory.list().map((e) => e.name));
  return fileItem(file, path, names);
}

// ---------- folders ----------

export function createFolder(parent: string, rawName: string): string {
  const name = sanitizeName(rawName) || 'Untitled';
  const parentDir = ensureDir(dirAt(parent));
  const unique = uniqueName(name, parentDir.list().map((e) => e.name), true);
  parentDir.createDirectory(unique);
  const path = joinPath(parent, unique);
  writeJson(new File(dirAt(path), PROJECT_FILE), { createdAt: localIso(new Date()) } satisfies ProjectMeta);
  notifyLibraryChanged();
  return path;
}

export function setStatus(path: string, status: Status | undefined) {
  const file = new File(dirAt(path), PROJECT_FILE);
  const meta = readJson<ProjectMeta>(file) ?? { createdAt: localIso(new Date()) };
  writeJson(file, { ...meta, status });
  notifyLibraryChanged();
}

// ---------- lyrics ----------

export function readLyrics(folder: string): Lyrics {
  const file = new File(dirAt(folder), LYRICS_FILE);
  const fallbackTitle = folderTitle(folder);
  if (!file.exists) {
    return { title: fallbackTitle, preamble: '', sections: [{ heading: 'Verse 1', body: '', note: '' }, { heading: 'Hook', body: '', note: '' }] };
  }
  return parseLyrics(file.textSync(), fallbackTitle);
}

function snapshotLyrics(dir: Directory, file: File, now: Date) {
  const history = new Directory(dir, HISTORY_DIR);
  const latest = history.exists
    ? Math.max(0, ...history.list().map((e) => (e instanceof File ? (e.modificationTime ?? 0) : 0)))
    : 0;
  if (now.getTime() - latest < HISTORY_GAP_MS) return;
  ensureDir(history);
  const name = `${localIso(now).slice(0, 19).replace(/:/g, '-')}.md`;
  file.copySync(new File(history, uniqueName(name, history.list().map((e) => e.name))));
}

export function writeLyrics(folder: string, lyrics: Lyrics) {
  const dir = ensureDir(dirAt(folder));
  const file = new File(dir, LYRICS_FILE);
  const text = serializeLyrics(lyrics);
  if (file.exists) {
    if (file.textSync() === text) return;
    snapshotLyrics(dir, file, new Date());
  } else {
    file.create({ intermediates: true });
  }
  file.write(text);
  notifyLibraryChanged();
}

// ---------- recordings ----------

export function sectionLinks(folder: string): Map<string, Item> {
  const links = new Map<string, Item>();
  for (const item of listFolder(folder).files) {
    const id = item.recording?.linkedSection;
    if (id && !links.has(id)) links.set(id, item);
  }
  return links;
}

export function saveRecording(folder: string, tempUri: string, meta: Omit<RecordingMeta, 'createdAt'>): string {
  const now = new Date();
  const dir = ensureDir(new Directory(dirAt(folder), RECORDINGS_DIR));
  const temp = new File(tempUri);
  const ext = splitExt(temp.name).ext || 'm4a';
  const title = sanitizeName(meta.title) || 'untitled';
  const name = uniqueName(`${dateStamp(now)} ${title}.${ext}`, dir.list().map((e) => e.name));
  const dest = new File(dir, name);
  temp.moveSync(dest);
  writeJson(new File(dir, `${splitExt(name).base}.json`), { ...meta, title: meta.title.trim() || 'untitled', createdAt: localIso(now) } satisfies RecordingMeta);
  notifyLibraryChanged();
  return joinPath(folder, RECORDINGS_DIR, name);
}

export function updateRecording(path: string, patch: Partial<RecordingMeta>) {
  const audio = fileAt(path);
  const sidecar = new File(audio.parentDirectory, `${splitExt(audio.name).base}.json`);
  const meta = readJson<RecordingMeta>(sidecar);
  writeJson(sidecar, { ...meta, ...patch });
  notifyLibraryChanged();
}

export function discardTemp(tempUri: string) {
  const f = new File(tempUri);
  if (f.exists) f.delete();
}

// ---------- imports ----------

/** Copy picked files into <folder>/files/. Returns the number copied. */
export function importFiles(folder: string, picked: { uri: string; name?: string | null }[]): number {
  if (picked.length === 0) return 0;
  const dir = ensureDir(new Directory(dirAt(folder), FILES_DIR));
  let count = 0;
  for (const p of picked) {
    const src = new File(p.uri);
    const name = uniqueName(sanitizeName(p.name || src.name) || 'file', dir.list().map((e) => e.name));
    src.copySync(new File(dir, name));
    count++;
  }
  notifyLibraryChanged();
  return count;
}

// ---------- delete / rename ----------

export function deleteItem(item: Item) {
  if (item.kind === 'folder') {
    dirAt(item.path).delete();
  } else {
    const file = fileAt(item.path);
    const sidecar = new File(file.parentDirectory, `${splitExt(file.name).base}.json`);
    file.delete();
    if (item.recording && sidecar.exists) sidecar.delete();
  }
  notifyLibraryChanged();
}

export function renameItem(item: Item, rawName: string): string {
  const parent = parentPath(item.path);
  const clean = sanitizeName(rawName);
  if (!clean) return item.path;
  if (item.kind === 'folder') {
    const dir = dirAt(item.path);
    const unique = uniqueName(clean, dir.parentDirectory.list().map((e) => e.name).filter((n) => n !== item.name), true);
    dir.rename(unique);
    notifyLibraryChanged();
    return joinPath(parent, unique);
  }
  if (item.recording) {
    updateRecording(item.path, { title: rawName.trim() });
    return item.path;
  }
  const file = fileAt(item.path);
  const withExt = item.ext && !clean.toLowerCase().endsWith(`.${item.ext}`) ? `${clean}.${item.ext}` : clean;
  const unique = uniqueName(withExt, file.parentDirectory.list().map((e) => e.name).filter((n) => n !== item.name));
  file.rename(unique);
  notifyLibraryChanged();
  return joinPath(parent, unique);
}

/** Open a file in the system viewer (Quick Look on iOS, an app chooser on Android). */
export async function previewFile(path: string): Promise<boolean> {
  const file = fileAt(path);
  try {
    if (!(await file.canPreview())) return false;
    await file.preview();
    return true;
  } catch {
    return false;
  }
}

// ---------- search ----------

export type SearchHit = {
  item: Item;
  /** Where the match was: the name, a lyric line, or a note. */
  field: 'name' | 'lyrics' | 'note';
  snippet: string;
  /** Section heading for lyric/note hits inside lyrics.md. */
  section?: string;
  /** Folder that holds the item, for the path line. */
  folder: string;
};

function snippetAround(text: string, query: string): string {
  const line = text.split('\n').find((l) => l.toLowerCase().includes(query)) ?? text;
  const at = line.toLowerCase().indexOf(query);
  const start = Math.max(0, at - 30);
  return `${start > 0 ? '…' : ''}${line.slice(start, start + 90).trim()}`;
}

/** Names, lyric text and notes, across the whole library. Small libraries: a plain walk is fast enough (SQLite index later). */
export function searchLibrary(rawQuery: string): SearchHit[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return [];
  const hits: SearchHit[] = [];
  const walk = (path: string, depth: number) => {
    const listing = listFolder(path);
    for (const f of listing.folders) {
      if (f.name.toLowerCase().includes(query)) hits.push({ item: f, field: 'name', snippet: f.name, folder: path });
    }
    for (const f of listing.files) {
      const folder = ['recordings', 'files'].includes(baseName(parentPath(f.path))) ? parentPath(parentPath(f.path)) : parentPath(f.path);
      if (f.kind === 'lyrics') {
        const lyrics = parseLyrics(fileAt(f.path).textSync(), folderTitle(folder));
        for (const s of lyrics.sections) {
          if (s.body.toLowerCase().includes(query)) hits.push({ item: f, field: 'lyrics', snippet: snippetAround(s.body, query), section: s.heading, folder });
          if (s.note.toLowerCase().includes(query)) hits.push({ item: f, field: 'note', snippet: snippetAround(s.note, query), section: s.heading, folder });
        }
        continue;
      }
      if (f.title.toLowerCase().includes(query) || f.name.toLowerCase().includes(query)) {
        hits.push({ item: f, field: 'name', snippet: f.title, folder });
      } else if (f.recording?.note?.toLowerCase().includes(query)) {
        hits.push({ item: f, field: 'note', snippet: snippetAround(f.recording.note, query), folder });
      } else if (f.kind === 'text' && f.preview?.toLowerCase().includes(query)) {
        hits.push({ item: f, field: 'lyrics', snippet: snippetAround(f.preview, query), folder });
      }
    }
    if (depth < 6) for (const d of listing.folders) walk(d.path, depth + 1);
  };
  walk('', 0);
  return hits;
}

/** File count and total bytes, for the sync screen. */
export function libraryStats(): { files: number; bytes: number } {
  let files = 0;
  let bytes = 0;
  const walk = (dir: Directory) => {
    for (const e of dir.list()) {
      if (e instanceof Directory) walk(e);
      else {
        files++;
        bytes += e.size ?? 0;
      }
    }
  };
  walk(root());
  return { files, bytes };
}
