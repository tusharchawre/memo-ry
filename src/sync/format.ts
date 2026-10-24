// Pure helpers for the Mac screen: pairing codes and short times. Unit-tested.
import type { Pairing } from './store';

/** The receiver's QR / pairing code: {"app":"memo-ry","host","port","token","name"}. */
export function parsePairing(text: string): Pairing | null {
  try {
    const v = JSON.parse(text.trim()) as Partial<Pairing> & { app?: string };
    if (v.app !== 'memo-ry' || typeof v.host !== 'string' || !v.host || typeof v.token !== 'string' || !v.token) return null;
    const port = Number(v.port);
    if (!Number.isInteger(port) || port <= 0 || port > 65535) return null;
    return { host: v.host, port, token: v.token, name: typeof v.name === 'string' && v.name ? v.name : 'Mac' };
  } catch {
    return null;
  }
}

/** "just now", "2 min ago", "3 h ago", "yesterday", "Oct 20". */
export function timeAgo(at: number, now: number): string {
  const s = Math.max(0, (now - at) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 2 * 86400) return 'yesterday';
  return new Date(at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Activity column: "now", "2m", "1h", then the weekday ("Thu"), then "Oct 20". */
export function shortAgo(at: number, now: number): string {
  const s = Math.max(0, (now - at) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 6 * 86400) return new Date(at).toLocaleDateString('en-US', { weekday: 'short' });
  return new Date(at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
