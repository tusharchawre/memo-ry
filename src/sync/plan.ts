// The sync decision, pure and unit-tested (docs/spec.md "Sync engine"). A three-way compare of the phone's
// files, the Mac's manifest and the state as of the last sync (`base`: path -> sha256 both sides agreed on).

export type Entry = { sha256: string; size: number; mtime: number };
export type Files = Map<string, Entry>;
export type Base = Map<string, string>;

export type Action =
  /** Phone -> Mac. */
  | { type: 'upload'; path: string }
  /** Mac -> phone. */
  | { type: 'download'; path: string }
  /** Both changed: download the Mac's copy as `copy`, send the phone's version, then send `copy` too. */
  | { type: 'conflict'; path: string; copy: string }
  /** Same content on both sides: just remember it. */
  | { type: 'record'; path: string; sha256: string }
  /** Gone on both sides: forget it. */
  | { type: 'forget'; path: string }
  /** Moved/renamed on the phone (same content now lives at another path): trash the old path on the Mac. */
  | { type: 'trash-mac'; path: string }
  /** Moved/renamed on the Mac: remove the old path here. */
  | { type: 'delete-phone'; path: string };

/** A deletion that is never applied automatically. `deletedOn` is the side where it disappeared. */
export type Decision = {
  id: string;
  deletedOn: 'mac' | 'phone';
  /** The folder or file that went missing (library-relative). */
  path: string;
  isFolder: boolean;
  /** Every file under `path` this decision covers. */
  files: string[];
};

export type Plan = { actions: Action[]; decisions: Decision[] };

/** project.json and recording sidecars: small metadata where last write wins instead of keep-both. */
export function isMetadata(path: string, siblings: (path: string) => boolean): boolean {
  const name = path.slice(path.lastIndexOf('/') + 1);
  if (name === 'project.json') return true;
  if (!name.endsWith('.json')) return false;
  const stem = path.slice(0, -'.json'.length);
  return ['m4a', 'mp3', 'wav', 'aac', 'caf', 'mp4'].some((ext) => siblings(`${stem}.${ext}`));
}

/** "Money Trees/files/beat.mp3" -> "Money Trees/files/beat (Mac).mp3", then "(Mac 2)"... */
export function conflictCopyName(path: string, taken: (path: string) => boolean): string {
  const slash = path.lastIndexOf('/');
  const dir = path.slice(0, slash + 1);
  const name = path.slice(slash + 1);
  const dot = name.lastIndexOf('.');
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  for (let n = 1; ; n++) {
    const candidate = `${dir}${stem} (Mac${n > 1 ? ` ${n}` : ''})${ext}`;
    if (!taken(candidate)) return candidate;
  }
}

/** Shortest ancestor folder of `path` with nothing under it in `present`, or `path` itself. */
function missingRoot(path: string, present: Files): { path: string; isFolder: boolean } {
  const parts = path.split('/');
  for (let i = 1; i < parts.length; i++) {
    const prefix = `${parts.slice(0, i).join('/')}/`;
    let any = false;
    for (const p of present.keys()) {
      if (p.startsWith(prefix)) {
        any = true;
        break;
      }
    }
    if (!any) return { path: prefix.slice(0, -1), isFolder: true };
  }
  return { path, isFolder: false };
}

export function planSync(phone: Files, mac: Files, base: Base): Plan {
  const actions: Action[] = [];
  const deletedOnMac: string[] = [];
  const deletedOnPhone: string[] = [];
  const newOnPhone = new Set<string>();
  const newOnMac = new Set<string>();
  const all = new Set([...phone.keys(), ...mac.keys(), ...base.keys()]);
  const taken = (p: string) => phone.has(p) || mac.has(p);

  for (const path of [...all].sort()) {
    const l = phone.get(path);
    const r = mac.get(path);
    const b = base.get(path);

    if (l && r) {
      if (l.sha256 === r.sha256) {
        if (b !== l.sha256) actions.push({ type: 'record', path, sha256: l.sha256 });
      } else if (b !== undefined && l.sha256 === b) {
        actions.push({ type: 'download', path });
      } else if (b !== undefined && r.sha256 === b) {
        actions.push({ type: 'upload', path });
      } else if (isMetadata(path, taken)) {
        actions.push({ type: l.mtime >= r.mtime ? 'upload' : 'download', path });
      } else {
        actions.push({ type: 'conflict', path, copy: conflictCopyName(path, taken) });
      }
    } else if (l) {
      if (b === undefined) {
        actions.push({ type: 'upload', path });
        newOnPhone.add(l.sha256);
      } else if (l.sha256 !== b) {
        // Edited here after the Mac deleted it: the edit wins, nothing is lost.
        actions.push({ type: 'upload', path });
      } else {
        deletedOnMac.push(path);
      }
    } else if (r) {
      if (b === undefined) {
        actions.push({ type: 'download', path });
        newOnMac.add(r.sha256);
      } else if (r.sha256 !== b) {
        actions.push({ type: 'download', path });
      } else {
        deletedOnPhone.push(path);
      }
    } else {
      actions.push({ type: 'forget', path });
    }
  }

  // A deleted file whose exact content just appeared at a new path on the same side was moved or renamed:
  // follow the move on the other side instead of asking. The content is safe at the new path.
  const decisions = new Map<string, Decision>();
  const ask = (deletedOn: 'mac' | 'phone', path: string, present: Files) => {
    const root = missingRoot(path, present);
    const id = `${deletedOn}:${root.path}`;
    const d = decisions.get(id) ?? { id, deletedOn, path: root.path, isFolder: root.isFolder, files: [] };
    d.files.push(path);
    decisions.set(id, d);
  };
  for (const path of deletedOnPhone) {
    if (newOnPhone.has(base.get(path)!)) actions.push({ type: 'trash-mac', path });
    else ask('phone', path, phone);
  }
  for (const path of deletedOnMac) {
    if (newOnMac.has(base.get(path)!)) actions.push({ type: 'delete-phone', path });
    else ask('mac', path, mac);
  }

  return { actions, decisions: [...decisions.values()] };
}
