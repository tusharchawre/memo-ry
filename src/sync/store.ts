// Sync state in expo-sqlite (an index, not the source of truth): pairing, the last agreed state per path,
// a hash cache keyed by size+mtime, pending decisions and the activity list.
import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';

import type { Base, Decision } from './plan';

export type Pairing = { host: string; port: number; token: string; name: string };
export type ActivityKind = 'up' | 'down' | 'trash' | 'delete';
export type Activity = { id: number; kind: ActivityKind; path: string; at: number };

let db: SQLiteDatabase | null = null;

function open(): SQLiteDatabase {
  if (db) return db;
  db = openDatabaseSync('sync.db');
  db.execSync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS base (path TEXT PRIMARY KEY NOT NULL, sha256 TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS hashes (path TEXT PRIMARY KEY NOT NULL, size INTEGER NOT NULL, mtime INTEGER NOT NULL, sha256 TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS activity (id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, path TEXT NOT NULL, at INTEGER NOT NULL);
  `);
  return db;
}

function getKv<T>(key: string): T | null {
  const row = open().getFirstSync<{ value: string }>('SELECT value FROM kv WHERE key = ?', key);
  if (!row) return null;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return null;
  }
}

function setKv(key: string, value: unknown) {
  if (value === null) open().runSync('DELETE FROM kv WHERE key = ?', key);
  else open().runSync('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)', key, JSON.stringify(value));
}

// ---------- pairing ----------

export const getPairing = () => getKv<Pairing>('pairing');

/** Pairing with a different Mac starts from a clean state; re-pairing the same Mac keeps it. */
export function setPairing(p: Pairing | null) {
  const old = getPairing();
  const sameMac = old && p && old.name === p.name && old.token === p.token;
  if (!sameMac) {
    open().execSync('DELETE FROM base; DELETE FROM activity;');
    setKv('decisions', null);
    setKv('lastSynced', null);
  }
  setKv('pairing', p);
}

export const getLastSynced = () => getKv<number>('lastSynced');
export const setLastSynced = (at: number) => setKv('lastSynced', at);

export const getDecisions = () => getKv<Decision[]>('decisions') ?? [];
export const setDecisions = (d: Decision[]) => setKv('decisions', d);

// ---------- base state ----------

export function getBase(): Base {
  return new Map(open().getAllSync<{ path: string; sha256: string }>('SELECT path, sha256 FROM base').map((r) => [r.path, r.sha256]));
}

export function setBase(path: string, sha256: string | null) {
  if (sha256 === null) open().runSync('DELETE FROM base WHERE path = ?', path);
  else open().runSync('INSERT OR REPLACE INTO base (path, sha256) VALUES (?, ?)', path, sha256);
}

// ---------- hash cache ----------

export type CachedHash = { size: number; mtime: number; sha256: string };

export function getHashes(): Map<string, CachedHash> {
  const rows = open().getAllSync<CachedHash & { path: string }>('SELECT path, size, mtime, sha256 FROM hashes');
  return new Map(rows.map(({ path, ...h }) => [path, h]));
}

export function setHash(path: string, h: CachedHash | null) {
  if (h === null) open().runSync('DELETE FROM hashes WHERE path = ?', path);
  else open().runSync('INSERT OR REPLACE INTO hashes (path, size, mtime, sha256) VALUES (?, ?, ?, ?)', path, h.size, h.mtime, h.sha256);
}

// ---------- activity ----------

export function addActivity(kind: ActivityKind, path: string) {
  const d = open();
  d.runSync('INSERT INTO activity (kind, path, at) VALUES (?, ?, ?)', kind, path, Date.now());
  d.runSync('DELETE FROM activity WHERE id NOT IN (SELECT id FROM activity ORDER BY id DESC LIMIT 100)');
}

export function recentActivity(limit = 8): Activity[] {
  return open().getAllSync<Activity>('SELECT id, kind, path, at FROM activity ORDER BY id DESC LIMIT ?', limit);
}
