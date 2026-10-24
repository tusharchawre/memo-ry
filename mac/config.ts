// Receiver settings: ~/.config/memo-ry/receiver.json holds the port and the pairing token (created on first run).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir, hostname, networkInterfaces } from 'node:os';
import { dirname, join } from 'node:path';

export type Config = { root: string; port: number; token: string; name: string; quiet?: boolean };

export const DEFAULT_PORT = 7337;
export const CONFIG_PATH = process.env.MEMORY_CONFIG || join(homedir(), '.config', 'memo-ry', 'receiver.json');

export function macName(): string {
  try {
    const out = Bun.spawnSync(['scutil', '--get', 'ComputerName']).stdout.toString().trim();
    if (out) return out;
  } catch {}
  return hostname().replace(/\.local$/, '');
}

/** The Mac's Wi-Fi/Ethernet IPv4 address, for the pairing QR. */
export function lanAddress(): string {
  const nets = networkInterfaces();
  const order = ['en0', 'en1', ...Object.keys(nets)];
  for (const name of order) {
    for (const n of nets[name] ?? []) {
      if (n.family === 'IPv4' && !n.internal && !n.address.startsWith('169.254.')) return n.address;
    }
  }
  return '127.0.0.1';
}

export function loadConfig(): Config {
  let saved: Partial<Config> = {};
  try {
    saved = JSON.parse(readFileSync(CONFIG_PATH, 'utf8')) as Partial<Config>;
  } catch {}
  const token = saved.token || Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString('hex');
  const port = Number(process.env.MEMORY_PORT) || saved.port || DEFAULT_PORT;
  if (!saved.token) {
    mkdirSync(dirname(CONFIG_PATH), { recursive: true });
    writeFileSync(CONFIG_PATH, `${JSON.stringify({ port, token }, null, 2)}\n`, { mode: 0o600 });
  }
  return {
    root: process.env.MEMORY_ROOT || join(homedir(), 'Music', 'Memo-ry'),
    port,
    token,
    name: macName(),
  };
}
