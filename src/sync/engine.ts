// The phone side of sync (docs/spec.md "Sync engine"): hash local files, fetch the Mac's manifest,
// plan (./plan.ts), apply, remember. Runs on launch, on foreground, a few seconds after any library
// change and every minute while the app is open, but only once paired and while the Mac answers.
import { File } from 'expo-file-system';
import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { notifyLibraryChanged, subscribeLibrary } from '@/library/events';
import { libraryFile, removeLibraryFile, scratchFile, walkLibraryFiles } from '@/library/library';

import { fileUrl, getManifest, getStatus, SyncHttpError, trashOnMac, uploadFile, type MacStatus } from './client';
import { planSync, type Action, type Decision, type Files } from './plan';
import * as store from './store';

export type SyncPhase = 'unpaired' | 'idle' | 'checking' | 'syncing' | 'offline' | 'unauthorized';

export type SyncState = {
  phase: SyncPhase;
  pairing: store.Pairing | null;
  mac: MacStatus | null;
  /** Transfers done / planned in the current run. */
  done: number;
  total: number;
  lastSynced: number | null;
  /** Files that failed in the last run (they are retried next time). */
  failed: number;
  decisions: Decision[];
  /** Bumped whenever the activity list changes. */
  activityVersion: number;
};

const CHANGE_DEBOUNCE_MS = 4000;
const POLL_MS = 60_000;

let state: SyncState = {
  phase: 'unpaired',
  pairing: null,
  mac: null,
  done: 0,
  total: 0,
  lastSynced: null,
  failed: 0,
  decisions: [],
  activityVersion: 0,
};
const listeners = new Set<() => void>();

function set(patch: Partial<SyncState>) {
  state = { ...state, ...patch };
  for (const l of listeners) l();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useSyncState(): SyncState {
  return useSyncExternalStore(subscribe, () => state);
}

// ---------- local files ----------

async function hashLocal(): Promise<Files> {
  const cache = store.getHashes();
  const out: Files = new Map();
  for (const f of walkLibraryFiles()) {
    const cached = cache.get(f.path);
    let sha256 = cached && cached.size === f.size && cached.mtime === f.mtime ? cached.sha256 : null;
    if (!sha256) {
      try {
        sha256 = await libraryFile(f.path).digest('SHA-256');
      } catch {
        continue; // deleted or unreadable mid-walk: next run
      }
      store.setHash(f.path, { size: f.size, mtime: f.mtime, sha256 });
    }
    cache.delete(f.path);
    out.set(f.path, { sha256, size: f.size, mtime: f.mtime });
  }
  for (const stale of cache.keys()) store.setHash(stale, null);
  return out;
}

// ---------- transfers ----------

async function download(p: store.Pairing, remotePath: string, localPath: string, expected: string): Promise<string> {
  const tmp = scratchFile();
  try {
    await File.downloadFileAsync(fileUrl(p, remotePath), tmp, { headers: { Authorization: `Bearer ${p.token}` }, idempotent: true });
    const sha256 = await tmp.digest('SHA-256');
    // Changed on the Mac while we were downloading: leave it for the next run.
    if (sha256 !== expected) throw new Error(`${remotePath} changed during download`);
    const dest = libraryFile(localPath, { create: true });
    if (dest.exists) dest.delete();
    tmp.moveSync(dest);
    const fresh = libraryFile(localPath);
    store.setHash(localPath, { size: fresh.size ?? 0, mtime: Math.round(fresh.lastModified ?? 0), sha256 });
    return sha256;
  } finally {
    if (tmp.exists) tmp.delete();
  }
}

async function apply(p: store.Pairing, action: Action, phone: Files, mac: Files): Promise<boolean> {
  switch (action.type) {
    case 'record':
      store.setBase(action.path, action.sha256);
      return false;
    case 'forget':
      store.setBase(action.path, null);
      return false;
    case 'upload': {
      const entry = phone.get(action.path)!;
      await uploadFile(p, action.path, libraryFile(action.path), entry);
      store.setBase(action.path, entry.sha256);
      store.addActivity('up', action.path);
      return false;
    }
    case 'download': {
      const sha256 = await download(p, action.path, action.path, mac.get(action.path)!.sha256);
      store.setBase(action.path, sha256);
      store.addActivity('down', action.path);
      return true;
    }
    case 'conflict': {
      const theirs = mac.get(action.path)!;
      await download(p, action.path, action.copy, theirs.sha256);
      const mine = phone.get(action.path)!;
      await uploadFile(p, action.path, libraryFile(action.path), mine);
      store.setBase(action.path, mine.sha256);
      const copy = libraryFile(action.copy);
      await uploadFile(p, action.copy, copy, { ...theirs, mtime: Math.round(copy.lastModified ?? Date.now()) });
      store.setBase(action.copy, theirs.sha256);
      store.addActivity('down', action.copy);
      store.addActivity('up', action.path);
      return true;
    }
    case 'trash-mac':
      await trashOnMac(p, action.path);
      store.setBase(action.path, null);
      store.addActivity('trash', action.path);
      return false;
    case 'delete-phone':
      removeLibraryFile(action.path);
      store.setHash(action.path, null);
      store.setBase(action.path, null);
      store.addActivity('delete', action.path);
      return true;
  }
}

// ---------- a run ----------

let running = false;
let again = false;

function libraryTouched() {
  notifyLibraryChanged(true);
}

/** Sync once now (or right after the current run). Safe to call any time. */
export async function syncNow(): Promise<void> {
  if (running) {
    again = true;
    return;
  }
  running = true;
  try {
    do {
      again = false;
      await runOnce();
    } while (again);
  } finally {
    running = false;
  }
}

async function runOnce() {
  const pairing = store.getPairing();
  if (!pairing) {
    set({ phase: 'unpaired', pairing: null, mac: null });
    return;
  }
  set({ pairing, phase: 'checking', done: 0, total: 0 });

  let mac: MacStatus;
  try {
    mac = await getStatus(pairing);
  } catch (e) {
    set({ phase: e instanceof SyncHttpError && e.status === 401 ? 'unauthorized' : 'offline' });
    return;
  }
  set({ mac });

  let failed = 0;
  let touched = false;
  try {
    const [macFiles, phoneFiles] = await Promise.all([getManifest(pairing), hashLocal()]);
    const plan = planSync(phoneFiles, macFiles, store.getBase());
    const transfers = plan.actions.filter((a) => a.type !== 'record' && a.type !== 'forget');
    set({ phase: transfers.length ? 'syncing' : 'checking', total: transfers.length, done: 0 });
    let done = 0;
    for (const action of plan.actions) {
      try {
        if (await apply(pairing, action, phoneFiles, macFiles)) touched = true;
      } catch (e) {
        failed++;
        console.warn('[sync]', action.type, action.path, e);
      }
      if (action.type !== 'record' && action.type !== 'forget') set({ done: ++done, activityVersion: state.activityVersion + 1 });
    }
    store.setDecisions(plan.decisions);
    if (failed === 0) store.setLastSynced(Date.now());
    set({ phase: 'idle', failed, decisions: plan.decisions, lastSynced: store.getLastSynced() });
  } catch (e) {
    console.warn('[sync] run failed', e);
    set({ phase: e instanceof SyncHttpError && e.status === 401 ? 'unauthorized' : 'offline' });
  } finally {
    if (touched) libraryTouched();
  }
}

// ---------- decisions ----------

/**
 * Keep: forget the last agreed state so the next run copies the file back to where it was deleted.
 * Delete: apply the deletion on the other side too (phone: delete; Mac: move to ~/Music/Memo-ry/.trash).
 */
export async function resolveDecision(decision: Decision, choice: 'keep' | 'delete') {
  const pairing = store.getPairing();
  if (!pairing) return;
  if (choice === 'delete' && decision.deletedOn === 'phone') {
    for (const path of decision.files) {
      await trashOnMac(pairing, path);
      store.setBase(path, null);
      store.addActivity('trash', path);
    }
  } else if (choice === 'delete') {
    for (const path of decision.files) {
      removeLibraryFile(path);
      store.setHash(path, null);
      store.setBase(path, null);
      store.addActivity('delete', path);
    }
    libraryTouched();
  } else {
    for (const path of decision.files) store.setBase(path, null);
  }
  const decisions = state.decisions.filter((d) => d.id !== decision.id);
  store.setDecisions(decisions);
  set({ decisions, activityVersion: state.activityVersion + 1 });
  await syncNow();
}

// ---------- pairing ----------

export async function pair(p: store.Pairing): Promise<MacStatus> {
  const status = await getStatus(p, 6000);
  store.setPairing({ ...p, name: status.name || p.name });
  set({ pairing: store.getPairing(), mac: status, decisions: store.getDecisions(), lastSynced: store.getLastSynced(), activityVersion: state.activityVersion + 1 });
  void syncNow();
  return status;
}

export function unpair() {
  store.setPairing(null);
  set({ phase: 'unpaired', pairing: null, mac: null, decisions: [], lastSynced: null, activityVersion: state.activityVersion + 1 });
}

export const recentActivity = store.recentActivity;

// ---------- automatic runs ----------

let started = false;

/** Call once at app start. */
export function startAutoSync() {
  if (started) return;
  started = true;
  const pairing = store.getPairing();
  set({ pairing, phase: pairing ? 'idle' : 'unpaired', decisions: store.getDecisions(), lastSynced: store.getLastSynced() });

  let timer: ReturnType<typeof setTimeout> | null = null;
  const later = (ms: number) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      void syncNow();
    }, ms);
  };

  subscribeLibrary((fromSync) => {
    if (!fromSync && store.getPairing()) later(CHANGE_DEBOUNCE_MS);
  });
  let poll: ReturnType<typeof setInterval> | null = null;
  const startPolling = () => {
    if (!poll) poll = setInterval(() => void syncNow(), POLL_MS);
  };
  AppState.addEventListener('change', (s) => {
    if (s === 'active') {
      void syncNow();
      startPolling();
    } else if (poll) {
      clearInterval(poll);
      poll = null;
    }
  });
  startPolling();
  void syncNow();
}
