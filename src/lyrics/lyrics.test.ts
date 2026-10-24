import { describe, expect, test } from 'bun:test';

import { nextHeading, parseLyrics, sectionId, serializeLyrics } from './lyrics';

const canonical = `# Money Trees

## Verse 1
[ verse 1 lyrics ]
second line

> 72 bpm, half-spoken, dry vocal.

## Hook
[ hook lyrics ]

## Bridge
`;

describe('lyrics.md', () => {
  test('parses title, sections and notes', () => {
    const l = parseLyrics(canonical, 'fallback');
    expect(l.title).toBe('Money Trees');
    expect(l.sections.map((s) => s.heading)).toEqual(['Verse 1', 'Hook', 'Bridge']);
    expect(l.sections[0].body).toBe('[ verse 1 lyrics ]\nsecond line');
    expect(l.sections[0].note).toBe('72 bpm, half-spoken, dry vocal.');
    expect(l.sections[2].body).toBe('');
  });

  test('canonical files round-trip unchanged', () => {
    expect(serializeLyrics(parseLyrics(canonical, 'x'))).toBe(canonical);
  });

  test('keeps text before the first section', () => {
    const text = '# Song\n\nfree text\n\n## Hook\nline\n';
    expect(serializeLyrics(parseLyrics(text, 'x'))).toBe(text);
  });

  test('no title falls back to the folder name', () => {
    expect(parseLyrics('## Hook\nline\n', 'DNA.').title).toBe('DNA.');
    expect(parseLyrics('', 'DNA.').sections).toEqual([]);
  });

  test('section ids and next headings', () => {
    expect(sectionId(' Verse 1 ')).toBe('verse-1');
    const sections = parseLyrics(canonical, 'x').sections;
    expect(nextHeading('Verse', sections)).toBe('Verse 2');
    expect(nextHeading('Hook', sections)).toBe('Hook 2');
    expect(nextHeading('Outro', sections)).toBe('Outro');
    expect(nextHeading('Verse', [])).toBe('Verse 1');
  });
});
