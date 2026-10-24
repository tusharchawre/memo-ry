import { describe, expect, test } from 'bun:test';

import { parsePairing, shortAgo, timeAgo } from './format';

describe('parsePairing', () => {
  test('reads the receiver code', () => {
    expect(parsePairing(' {"app":"memo-ry","host":"192.168.1.5","port":7337,"token":"abc","name":"MacBook Air"} ')).toEqual({
      host: '192.168.1.5',
      port: 7337,
      token: 'abc',
      name: 'MacBook Air',
    });
  });

  test('rejects anything else', () => {
    expect(parsePairing('https://example.com')).toBeNull();
    expect(parsePairing('{"host":"x","port":1,"token":"t"}')).toBeNull();
    expect(parsePairing('{"app":"memo-ry","host":"x","port":0,"token":"t"}')).toBeNull();
    expect(parsePairing('{"app":"memo-ry","host":"x","port":7337,"token":""}')).toBeNull();
  });
});

describe('times', () => {
  const now = Date.UTC(2026, 9, 24, 12);
  test('timeAgo', () => {
    expect(timeAgo(now - 20_000, now)).toBe('just now');
    expect(timeAgo(now - 2 * 60_000, now)).toBe('2 min ago');
    expect(timeAgo(now - 3 * 3600_000, now)).toBe('3 h ago');
    expect(timeAgo(now - 30 * 3600_000, now)).toBe('yesterday');
  });
  test('shortAgo', () => {
    expect(shortAgo(now - 5_000, now)).toBe('now');
    expect(shortAgo(now - 2 * 60_000, now)).toBe('2m');
    expect(shortAgo(now - 3600_000, now)).toBe('1h');
  });
});
