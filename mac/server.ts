// Memo-ry receiver: a small HTTP server on the local network that mirrors the phone's library into
// ~/Music/Memo-ry. Protocol: docs/spec.md "Library location and sync". Run: `bun mac/server.ts`.
import { mkdirSync, readdirSync, renameSync, rmSync, statSync, statfsSync, utimesSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

import QRCode from 'qrcode';

import { loadConfig, lanAddress, type Config } from './config';

export const VERSION = '1';

export type ManifestEntry = { path: string; size: number; mtime: number; sha256: string };

type HashCacheEntry = { size: number; mtime: number; sha256: string };

/** Library-relative, '/'-separated path from URL segments. Null when it would escape the root or touch a dotfile. */
export function safeRelPath(raw: string): string | null {
  let parts: string[];
  try {
    parts = raw.split('/').filter(Boolean).map(decodeURIComponent);
  } catch {
    return null;
  }
  if (parts.length === 0) return null;
  for (const p of parts) {
    if (p === '.' || p === '..' || p.startsWith('.') || p.includes('/') || p.includes('\\') || p.includes('\0')) return null;
  }
  return parts.join('/');
}

async function sha256Of(path: string): Promise<string> {
  const hasher = new Bun.CryptoHasher('sha256');
  const stream = Bun.file(path).stream();
  for await (const chunk of stream) hasher.update(chunk);
  return hasher.digest('hex');
}

function localStamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function createReceiver(config: Config) {
  const root = resolve(config.root);
  mkdirSync(root, { recursive: true });
  const hashCache = new Map<string, HashCacheEntry>();

  const abs = (rel: string) => {
    const p = resolve(root, ...rel.split('/'));
    if (p !== root && !p.startsWith(root + sep)) throw new Error('outside root');
    return p;
  };

  async function manifest(): Promise<ManifestEntry[]> {
    const out: ManifestEntry[] = [];
    const seen = new Set<string>();
    const walk = async (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name.startsWith('.')) continue;
        const full = join(dir, entry.name);
        if (entry.isDirectory()) await walk(full);
        else if (entry.isFile()) {
          const rel = relative(root, full).split(sep).join('/');
          const st = statSync(full);
          const mtime = Math.round(st.mtimeMs);
          let cached = hashCache.get(rel);
          if (!cached || cached.size !== st.size || cached.mtime !== mtime) {
            cached = { size: st.size, mtime, sha256: await sha256Of(full) };
            hashCache.set(rel, cached);
          }
          seen.add(rel);
          out.push({ path: rel, ...cached });
        }
      }
    };
    await walk(root);
    for (const key of hashCache.keys()) if (!seen.has(key)) hashCache.delete(key);
    return out;
  }

  async function putFile(rel: string, req: Request): Promise<Response> {
    const target = abs(rel);
    const expected = req.headers.get('x-sha256')?.toLowerCase();
    const mtime = Number(req.headers.get('x-mtime'));
    mkdirSync(dirname(target), { recursive: true });
    const tmp = join(dirname(target), `.memo-ry-${crypto.randomUUID()}.tmp`);
    try {
      await Bun.write(tmp, new Response(req.body));
      const actual = await sha256Of(tmp);
      if (expected && actual !== expected) {
        rmSync(tmp, { force: true });
        return Response.json({ error: 'sha256 mismatch', expected, actual }, { status: 400 });
      }
      if (Number.isFinite(mtime) && mtime > 0) utimesSync(tmp, new Date(), new Date(mtime));
      renameSync(tmp, target);
      const st = statSync(target);
      const entry = { size: st.size, mtime: Math.round(st.mtimeMs), sha256: actual };
      hashCache.set(rel, entry);
      log(`↓ ${rel}`);
      return Response.json({ path: rel, ...entry });
    } catch (e) {
      rmSync(tmp, { force: true });
      throw e;
    }
  }

  function trash(rel: string): Response {
    const source = abs(rel);
    try {
      statSync(source);
    } catch {
      return Response.json({ error: 'not found' }, { status: 404 });
    }
    const dest = resolve(root, '.trash', localStamp(new Date()), ...rel.split('/'));
    mkdirSync(dirname(dest), { recursive: true });
    let final = dest;
    for (let n = 2; exists(final); n++) final = `${dest} ${n}`;
    renameSync(source, final);
    hashCache.delete(rel);
    pruneEmptyDirs(dirname(source));
    log(`trash ${rel}`);
    return Response.json({ ok: true });
  }

  function pruneEmptyDirs(dir: string) {
    while (dir !== root && dir.startsWith(root + sep)) {
      try {
        if (readdirSync(dir).some((n) => n !== '.DS_Store')) return;
        rmSync(dir, { recursive: true, force: true });
      } catch {
        return;
      }
      dir = dirname(dir);
    }
  }

  function status() {
    let freeBytes: number | null = null;
    try {
      const fs = statfsSync(root);
      freeBytes = Number(fs.bavail) * Number(fs.bsize);
    } catch {}
    return { ok: true, name: config.name, version: VERSION, freeBytes };
  }

  function pairingPayload() {
    return JSON.stringify({ app: 'memo-ry', host: lanAddress(), port: config.port, token: config.token, name: config.name });
  }

  async function pairPage(): Promise<Response> {
    const payload = pairingPayload();
    const svg = await QRCode.toString(payload, { type: 'svg', margin: 2, color: { dark: '#000000', light: '#ffffff' } });
    const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>Pair Memo-ry</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#000;color:#F5F5F5;font-family:-apple-system,system-ui,sans-serif}
main{display:flex;flex-direction:column;gap:20px;align-items:center;max-width:360px;padding:20px;text-align:center}
.qr{width:280px;background:#fff;border-radius:16px;padding:8px}.qr svg{display:block;width:100%;height:auto}
p{margin:0;color:#8E8E93;font-size:15px;line-height:1.4}code{font:12px ui-monospace,monospace;color:#C7C7CC;word-break:break-all}</style>
<main><h1 style="margin:0;font-size:28px;font-weight:600;letter-spacing:-0.6px">Pair with Memo-ry</h1>
<div class="qr">${svg}</div>
<p>On the phone: Library → Mac icon → Pair with Mac, then scan this code. Phone and Mac must be on the same Wi-Fi.</p>
<p>No camera? Copy this code and use “Paste code instead”:</p><code>${Bun.escapeHTML(payload)}</code></main>`;
    return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
  }

  function authorized(req: Request): boolean {
    return req.headers.get('authorization') === `Bearer ${config.token}`;
  }

  async function handle(req: Request, server: Bun.Server<undefined>): Promise<Response> {
    const url = new URL(req.url);
    const ip = server.requestIP(req)?.address ?? '';
    if (url.pathname === '/pair' && req.method === 'GET') {
      // The page shows the token, so only the Mac itself may open it.
      if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(ip)) return new Response('Open this on the Mac', { status: 403 });
      return pairPage();
    }
    if (!authorized(req)) return Response.json({ error: 'unauthorized' }, { status: 401 });

    if (url.pathname === '/status' && req.method === 'GET') return Response.json(status());
    if (url.pathname === '/manifest' && req.method === 'GET') return Response.json(await manifest());
    if (url.pathname === '/trash' && req.method === 'POST') {
      const body = (await req.json().catch(() => null)) as { path?: unknown } | null;
      const rel = typeof body?.path === 'string' ? safeRelPath(body.path.split('/').map(encodeURIComponent).join('/')) : null;
      if (!rel) return Response.json({ error: 'bad path' }, { status: 400 });
      return trash(rel);
    }
    if (url.pathname.startsWith('/files/')) {
      const rel = safeRelPath(url.pathname.slice('/files/'.length));
      if (!rel) return Response.json({ error: 'bad path' }, { status: 400 });
      if (req.method === 'PUT') return putFile(rel, req);
      if (req.method === 'GET') {
        const file = Bun.file(abs(rel));
        if (!(await file.exists())) return Response.json({ error: 'not found' }, { status: 404 });
        log(`↑ ${rel}`);
        return new Response(file);
      }
    }
    return Response.json({ error: 'not found' }, { status: 404 });
  }

  function log(line: string) {
    if (!config.quiet) console.log(`${new Date().toLocaleTimeString()} ${line}`);
  }

  return { root, handle, manifest, pairingPayload };
}

function exists(path: string): boolean {
  try {
    statSync(path);
    return true;
  } catch {
    return false;
  }
}

export function serve(config: Config) {
  const receiver = createReceiver(config);
  const server = Bun.serve({
    port: config.port,
    hostname: '0.0.0.0',
    // Bounces and videos can be big; the default cap is 128 MB.
    maxRequestBodySize: 8 * 1024 ** 3,
    idleTimeout: 255,
    fetch: (req, srv) =>
      receiver.handle(req, srv).catch((e: unknown) => {
        console.error(e);
        return Response.json({ error: String(e) }, { status: 500 });
      }),
  });
  return { server, receiver };
}

if (import.meta.main) {
  const config = loadConfig();
  const { server, receiver } = serve(config);
  const qr = await QRCode.toString(receiver.pairingPayload(), { type: 'terminal', small: true });
  console.log(`Memo-ry receiver ${VERSION} on ${config.name}`);
  console.log(`Library: ${receiver.root}`);
  console.log(`Listening on http://${lanAddress()}:${server.port}`);
  console.log(`\nScan with Memo-ry (Mac → Pair with Mac), or open http://localhost:${server.port}/pair\n`);
  console.log(qr);
}
