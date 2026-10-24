import { describe, expect, test } from 'bun:test';

import { displayTitle, downsample, formatDuration, kindOf, levelFromDb, sanitizeName, seededPeaks, uniqueName } from './names';

describe('names', () => {
  test('kinds', () => {
    expect(kindOf('lyrics.md')).toBe('lyrics');
    expect(kindOf('notes.md')).toBe('text');
    expect(kindOf('Hook.M4A')).toBe('audio');
    expect(kindOf('beat-v2.mid')).toBe('midi');
    expect(kindOf('session.flp')).toBe('other');
    expect(kindOf('noext')).toBe('other');
  });

  test('sanitize and unique names', () => {
    expect(sanitizeName('  a/b: c?  ')).toBe('a-b- c-');
    expect(sanitizeName('..hidden')).toBe('hidden');
    expect(uniqueName('cover.jpg', ['Cover.jpg', 'cover 2.jpg'])).toBe('cover 3.jpg');
    expect(uniqueName('DAMN.', ['damn.'], true)).toBe('DAMN. 2');
    expect(uniqueName('new.txt', [])).toBe('new.txt');
  });

  test('display titles drop the date prefix', () => {
    expect(displayTitle('2026-10-24 hook melody.m4a')).toBe('hook melody');
    expect(displayTitle('reference.mp3')).toBe('reference');
  });

  test('levels and peaks', () => {
    expect(levelFromDb(-160)).toBe(0);
    expect(levelFromDb(0)).toBe(1);
    expect(levelFromDb(-30)).toBe(0.5);
    expect(levelFromDb(undefined)).toBe(0);
    expect(downsample([0, 1, 0, 1], 2)).toEqual([0.5, 0.5]);
    expect(downsample([0.2], 3)).toEqual([0.2, 0.2, 0.2]);
    expect(downsample([], 4)).toEqual([]);
    expect(seededPeaks('a', 8)).toEqual(seededPeaks('a', 8));
    expect(seededPeaks('a', 8)).not.toEqual(seededPeaks('b', 8));
  });

  test('durations', () => {
    expect(formatDuration(9)).toBe('0:09');
    expect(formatDuration(178)).toBe('2:58');
    expect(formatDuration(3725)).toBe('1:02:05');
  });
});
