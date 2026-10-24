import { describe, expect, test } from 'bun:test';

import { conflictCopyName, isMetadata, planSync, type Base, type Entry, type Files } from './plan';

const e = (sha256: string, mtime = 1): Entry => ({ sha256, size: sha256.length, mtime });
const files = (o: Record<string, Entry>): Files => new Map(Object.entries(o));
const base = (o: Record<string, string>): Base => new Map(Object.entries(o));

const LYRICS = 'Money Trees/lyrics.md';

describe('planSync', () => {
  test('nothing to do when both sides match the base', () => {
    expect(planSync(files({ [LYRICS]: e('a') }), files({ [LYRICS]: e('a') }), base({ [LYRICS]: 'a' }))).toEqual({ actions: [], decisions: [] });
  });

  test('first sync: same content is recorded, one-sided files move across', () => {
    const plan = planSync(files({ [LYRICS]: e('a'), 'Inbox/hum.m4a': e('h') }), files({ [LYRICS]: e('a'), 'DAMN./mix.wav': e('w') }), base({}));
    expect(plan.actions).toEqual([
      { type: 'download', path: 'DAMN./mix.wav' },
      { type: 'upload', path: 'Inbox/hum.m4a' },
      { type: 'record', path: LYRICS, sha256: 'a' },
    ]);
  });

  test('changed on one side', () => {
    expect(planSync(files({ [LYRICS]: e('b') }), files({ [LYRICS]: e('a') }), base({ [LYRICS]: 'a' })).actions).toEqual([{ type: 'upload', path: LYRICS }]);
    expect(planSync(files({ [LYRICS]: e('a') }), files({ [LYRICS]: e('c') }), base({ [LYRICS]: 'a' })).actions).toEqual([{ type: 'download', path: LYRICS }]);
  });

  test('changed on both sides keeps both', () => {
    const plan = planSync(files({ [LYRICS]: e('b') }), files({ [LYRICS]: e('c'), 'Money Trees/lyrics (Mac).md': e('x') }), base({ [LYRICS]: 'a' }));
    expect(plan.actions).toContainEqual({ type: 'conflict', path: LYRICS, copy: 'Money Trees/lyrics (Mac 2).md' });
  });

  test('metadata is last write wins', () => {
    const p = 'Money Trees/project.json';
    expect(planSync(files({ [p]: e('b', 5) }), files({ [p]: e('c', 9) }), base({ [p]: 'a' })).actions).toEqual([{ type: 'download', path: p }]);
    expect(planSync(files({ [p]: e('b', 9) }), files({ [p]: e('c', 5) }), base({})).actions).toEqual([{ type: 'upload', path: p }]);
  });

  test('deletions are never applied, they become decisions grouped by folder', () => {
    const plan = planSync(
      files({ 'DAMN./a.m4a': e('1'), 'DAMN./files/b.pdf': e('2'), 'Inbox/c.txt': e('3'), 'Inbox/d.txt': e('4') }),
      files({ 'Inbox/d.txt': e('4') }),
      base({ 'DAMN./a.m4a': '1', 'DAMN./files/b.pdf': '2', 'Inbox/c.txt': '3', 'Inbox/d.txt': '4' }),
    );
    expect(plan.actions).toEqual([]);
    expect(plan.decisions).toEqual([
      { id: 'mac:DAMN.', deletedOn: 'mac', path: 'DAMN.', isFolder: true, files: ['DAMN./a.m4a', 'DAMN./files/b.pdf'] },
      { id: 'mac:Inbox/c.txt', deletedOn: 'mac', path: 'Inbox/c.txt', isFolder: false, files: ['Inbox/c.txt'] },
    ]);
    const onPhone = planSync(files({}), files({ 'Inbox/c.txt': e('3') }), base({ 'Inbox/c.txt': '3' }));
    expect(onPhone.decisions).toEqual([{ id: 'phone:Inbox', deletedOn: 'phone', path: 'Inbox', isFolder: true, files: ['Inbox/c.txt'] }]);
  });

  test('an edit beats a deletion on the other side', () => {
    expect(planSync(files({ 'Inbox/c.txt': e('new') }), files({}), base({ 'Inbox/c.txt': 'old' })).actions).toEqual([{ type: 'upload', path: 'Inbox/c.txt' }]);
    expect(planSync(files({}), files({ 'Inbox/c.txt': e('new') }), base({ 'Inbox/c.txt': 'old' })).actions).toEqual([{ type: 'download', path: 'Inbox/c.txt' }]);
  });

  test('renames follow across instead of asking', () => {
    const renamedOnPhone = planSync(files({ 'Money Tree$/lyrics.md': e('a') }), files({ [LYRICS]: e('a') }), base({ [LYRICS]: 'a' }));
    expect(renamedOnPhone).toEqual({ actions: [{ type: 'upload', path: 'Money Tree$/lyrics.md' }, { type: 'trash-mac', path: LYRICS }], decisions: [] });
    const renamedOnMac = planSync(files({ [LYRICS]: e('a') }), files({ 'Money Trees 2/lyrics.md': e('a') }), base({ [LYRICS]: 'a' }));
    expect(renamedOnMac).toEqual({ actions: [{ type: 'download', path: 'Money Trees 2/lyrics.md' }, { type: 'delete-phone', path: LYRICS }], decisions: [] });
  });

  test('gone on both sides is forgotten', () => {
    expect(planSync(files({}), files({}), base({ x: 'a' })).actions).toEqual([{ type: 'forget', path: 'x' }]);
  });
});

describe('helpers', () => {
  test('conflict copy names', () => {
    expect(conflictCopyName('a/beat.mp3', () => false)).toBe('a/beat (Mac).mp3');
    expect(conflictCopyName('README', () => false)).toBe('README (Mac)');
  });

  test('metadata', () => {
    expect(isMetadata('x/project.json', () => false)).toBe(true);
    expect(isMetadata('x/recordings/2026-10-24 hum.json', (p) => p === 'x/recordings/2026-10-24 hum.m4a')).toBe(true);
    expect(isMetadata('x/files/data.json', () => false)).toBe(false);
  });
});
