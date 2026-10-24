import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { safeRelPath, serve } from './server';

const token = 'test-token';
let root: string;
let base: string;
let stop: () => void;

const auth = { Authorization: `Bearer ${token}` };
const enc = (p: string) => p.split('/').map(encodeURIComponent).join('/');
const sha = (s: string) => new Bun.CryptoHasher('sha256').update(s).digest('hex');

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'memo-ry-recv-'));
  const { server } = serve({ root, port: 0, token, name: 'Test Mac', quiet: true });
  base = `http://127.0.0.1:${server.port}`;
  stop = () => server.stop(true);
});

afterAll(() => {
  stop();
  rmSync(root, { recursive: true, force: true });
});

describe('safeRelPath', () => {
  test('decodes segments', () => expect(safeRelPath('DAMN.%2FX/a%20b.m4a')).toBeNull());
  test('plain', () => expect(safeRelPath('good%20kid/Money%20Trees/lyrics.md')).toBe('good kid/Money Trees/lyrics.md'));
  test('rejects traversal and dotfiles', () => {
    expect(safeRelPath('../etc/passwd')).toBeNull();
    expect(safeRelPath('a/%2E%2E/b')).toBeNull();
    expect(safeRelPath('.trash/x')).toBeNull();
    expect(safeRelPath('')).toBeNull();
  });
});

describe('receiver', () => {
  test('401 without the token', async () => {
    expect((await fetch(`${base}/status`)).status).toBe(401);
    expect((await fetch(`${base}/manifest`, { headers: { Authorization: 'Bearer nope' } })).status).toBe(401);
  });

  test('status', async () => {
    const res = await fetch(`${base}/status`, { headers: auth });
    expect(await res.json()).toMatchObject({ ok: true, name: 'Test Mac' });
  });

  test('put, manifest, get, trash', async () => {
    const path = 'good kid, m.A.A.d city/Money Trees/lyrics.md';
    const body = '# Money Trees\n\n## Verse 1\n[ verse 1 lyrics ]\n';
    const mtime = Date.UTC(2026, 9, 24, 12, 0, 0);
    const put = await fetch(`${base}/files/${enc(path)}`, { method: 'PUT', headers: { ...auth, 'X-Sha256': sha(body), 'X-Mtime': String(mtime) }, body });
    expect(put.status).toBe(200);
    expect(readFileSync(join(root, path), 'utf8')).toBe(body);
    expect(Math.round(statSync(join(root, path)).mtimeMs)).toBe(mtime);

    writeFileSync(join(root, '.DS_Store'), 'x');
    const manifest = (await (await fetch(`${base}/manifest`, { headers: auth })).json()) as { path: string; sha256: string; size: number; mtime: number }[];
    expect(manifest).toEqual([{ path, size: body.length, mtime, sha256: sha(body) }]);

    const got = await fetch(`${base}/files/${enc(path)}`, { headers: auth });
    expect(await got.text()).toBe(body);

    const trash = await fetch(`${base}/trash`, { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ path }) });
    expect(trash.status).toBe(200);
    expect(existsSync(join(root, path))).toBe(false);
    expect(existsSync(join(root, 'good kid, m.A.A.d city'))).toBe(false);
    const day = readdirSync(join(root, '.trash'))[0];
    expect(readFileSync(join(root, '.trash', day, path), 'utf8')).toBe(body);
    expect(await (await fetch(`${base}/manifest`, { headers: auth })).json()).toEqual([]);
  });

  test('rejects a body that does not match X-Sha256', async () => {
    const res = await fetch(`${base}/files/Inbox/x.txt`, { method: 'PUT', headers: { ...auth, 'X-Sha256': sha('other') }, body: 'hello' });
    expect(res.status).toBe(400);
    expect(existsSync(join(root, 'Inbox', 'x.txt'))).toBe(false);
    expect(readdirSync(join(root, 'Inbox'))).toEqual([]);
  });

  test('pair page only on localhost', async () => {
    const res = await fetch(`${base}/pair`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain(token);
  });
});
