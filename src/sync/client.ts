// HTTP client for the Mac receiver (mac/server.ts). Protocol: docs/spec.md "Library location and sync".
import { UploadType, type File } from 'expo-file-system';

import type { Entry } from './plan';
import type { Pairing } from './store';

export type MacStatus = { ok: boolean; name: string; version: string; freeBytes: number | null };

export class SyncHttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const baseUrl = (p: Pairing) => `http://${p.host}:${p.port}`;
const headers = (p: Pairing) => ({ Authorization: `Bearer ${p.token}` });
export const fileUrl = (p: Pairing, path: string) => `${baseUrl(p)}/files/${path.split('/').map(encodeURIComponent).join('/')}`;

async function request(p: Pairing, path: string, init: RequestInit = {}, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${baseUrl(p)}${path}`, { ...init, headers: { ...headers(p), ...init.headers }, signal: controller.signal });
    if (!res.ok) throw new SyncHttpError(res.status, `${init.method ?? 'GET'} ${path}: ${res.status}`);
    return res;
  } finally {
    clearTimeout(timer);
  }
}

export async function getStatus(p: Pairing, timeoutMs = 4000): Promise<MacStatus> {
  return (await (await request(p, '/status', {}, timeoutMs)).json()) as MacStatus;
}

export async function getManifest(p: Pairing): Promise<Map<string, Entry>> {
  const list = (await (await request(p, '/manifest', {}, 120000)).json()) as ({ path: string } & Entry)[];
  return new Map(list.map(({ path, ...e }) => [path, e]));
}

export async function trashOnMac(p: Pairing, path: string) {
  await request(p, '/trash', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path }) });
}

export async function uploadFile(p: Pairing, path: string, file: File, entry: Entry) {
  const res = await file.upload(fileUrl(p, path), {
    httpMethod: 'PUT',
    uploadType: UploadType.BINARY_CONTENT,
    headers: { ...headers(p), 'Content-Type': 'application/octet-stream', 'X-Sha256': entry.sha256, 'X-Mtime': String(entry.mtime) },
  });
  if (res.status < 200 || res.status >= 300) throw new SyncHttpError(res.status, `upload ${path}: ${res.status} ${res.body}`);
}
