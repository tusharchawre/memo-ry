// Pure helpers for the library: file kinds, names, peaks. No I/O, unit-tested.

export type Kind = 'folder' | 'lyrics' | 'text' | 'audio' | 'image' | 'video' | 'midi' | 'pdf' | 'other';

const EXT_KIND: Record<string, Kind> = {
  m4a: 'audio', mp3: 'audio', wav: 'audio', aac: 'audio', aif: 'audio', aiff: 'audio', flac: 'audio', ogg: 'audio', opus: 'audio', caf: 'audio',
  jpg: 'image', jpeg: 'image', png: 'image', heic: 'image', heif: 'image', webp: 'image', gif: 'image',
  mp4: 'video', mov: 'video', m4v: 'video', webm: 'video',
  mid: 'midi', midi: 'midi',
  md: 'text', txt: 'text',
  pdf: 'pdf',
};

export function splitExt(fileName: string): { base: string; ext: string } {
  const dot = fileName.lastIndexOf('.');
  if (dot <= 0) return { base: fileName, ext: '' };
  return { base: fileName.slice(0, dot), ext: fileName.slice(dot + 1).toLowerCase() };
}

export function kindOf(fileName: string): Kind {
  if (fileName === 'lyrics.md') return 'lyrics';
  return EXT_KIND[splitExt(fileName).ext] ?? 'other';
}

/** Characters that break paths on macOS/Android/Windows. */
export function sanitizeName(name: string): string {
  return name.replace(/[/\\:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim().replace(/^\.+/, '');
}

/** "cover.jpg" -> "cover 2.jpg" when taken (case-insensitive, like macOS). Folders keep dots ("DAMN. 2"). */
export function uniqueName(fileName: string, taken: Iterable<string>, isFolder = false): string {
  const lower = new Set([...taken].map((t) => t.toLowerCase()));
  if (!lower.has(fileName.toLowerCase())) return fileName;
  const { base, ext } = isFolder ? { base: fileName, ext: '' } : splitExt(fileName);
  for (let n = 2; ; n++) {
    const candidate = ext ? `${base} ${n}.${ext}` : `${base} ${n}`;
    if (!lower.has(candidate.toLowerCase())) return candidate;
  }
}

/** 2026-10-24 (local date), the prefix of new recording names. */
export function dateStamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** ISO time with the local offset, e.g. 2026-10-24T22:00:00+05:30. */
export function localIso(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? '+' : '-';
  const abs = Math.abs(off);
  return (
    `${dateStamp(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` +
    `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  );
}

/** Drop the "2026-10-24 " prefix from a recording's file name for display. */
export function displayTitle(fileName: string): string {
  return splitExt(fileName).base.replace(/^\d{4}-\d{2}-\d{2} /, '');
}

/** expo-audio metering is dBFS (about -160..0). Map -60..0 dB to 0..1. */
export function levelFromDb(db: number | undefined): number {
  if (db === undefined || !Number.isFinite(db)) return 0;
  return Math.min(1, Math.max(0, (db + 60) / 60));
}

/** Average a level series down to `count` buckets (0..1, two decimals). */
export function downsample(levels: number[], count = 64): number[] {
  if (levels.length === 0) return [];
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const start = Math.floor((i * levels.length) / count);
    const end = Math.max(start + 1, Math.floor(((i + 1) * levels.length) / count));
    let sum = 0;
    for (let j = start; j < end && j < levels.length; j++) sum += levels[j];
    out.push(Math.round((sum / (end - start)) * 100) / 100);
  }
  return out;
}

/** A stable pseudo-waveform for audio with no saved peaks, seeded by its name. */
export function seededPeaks(seedText: string, count = 64): number[] {
  let seed = 0;
  for (let i = 0; i < seedText.length; i++) seed = (seed * 31 + seedText.charCodeAt(i)) % 1000;
  const s = seed / 100;
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const v = Math.abs(Math.sin(i * 0.9 + s) * 0.55 + Math.sin(i * 0.31 + s * 1.7) * 0.45);
    out.push(Math.max(0.12, Math.round(v * 100) / 100));
  }
  return out;
}

export function formatDuration(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`;
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
