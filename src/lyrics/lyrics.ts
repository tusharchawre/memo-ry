// lyrics.md <-> sections. Format: docs/spec.md "lyrics.md format". Pure, no I/O.

export type Section = {
  heading: string;
  body: string;
  note: string;
};

export type Lyrics = {
  title: string;
  /** Text between the title and the first section, kept as-is. */
  preamble: string;
  sections: Section[];
};

export const SECTION_KINDS = ['Intro', 'Verse', 'Pre-hook', 'Hook', 'Bridge', 'Outro'] as const;

export function sectionId(heading: string): string {
  return heading.trim().toLowerCase().replace(/\s+/g, '-');
}

function trimBlankLines(lines: string[]): string {
  let start = 0;
  let end = lines.length;
  while (start < end && lines[start].trim() === '') start++;
  while (end > start && lines[end - 1].trim() === '') end--;
  return lines.slice(start, end).join('\n');
}

export function parseLyrics(text: string, fallbackTitle: string): Lyrics {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  let title = fallbackTitle;
  let i = 0;
  while (i < lines.length && lines[i].trim() === '') i++;
  if (i < lines.length && /^# (?!#)/.test(lines[i])) {
    title = lines[i].slice(2).trim() || fallbackTitle;
    i++;
  }

  const preamble: string[] = [];
  const sections: Section[] = [];
  let current: { heading: string; body: string[]; note: string[] } | null = null;

  const flush = () => {
    if (!current) return;
    sections.push({
      heading: current.heading,
      body: trimBlankLines(current.body),
      note: current.note.join('\n'),
    });
  };

  for (; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('## ')) {
      flush();
      current = { heading: line.slice(3).trim(), body: [], note: [] };
    } else if (!current) {
      preamble.push(line);
    } else if (line.startsWith('> ') || line === '>') {
      current.note.push(line.slice(2));
    } else {
      current.body.push(line);
    }
  }
  flush();

  return { title, preamble: trimBlankLines(preamble), sections };
}

export function serializeLyrics(lyrics: Lyrics): string {
  const blocks = [`# ${lyrics.title}`];
  if (lyrics.preamble) blocks.push(lyrics.preamble);
  for (const s of lyrics.sections) {
    let block = `## ${s.heading}`;
    if (s.body) block += `\n${s.body}`;
    if (s.note) block += `\n\n${s.note.split('\n').map((l) => `> ${l}`).join('\n')}`;
    blocks.push(block);
  }
  return `${blocks.join('\n\n')}\n`;
}

/** "Verse" -> "Verse 2" when a Verse already exists, so ids stay unique. */
export function nextHeading(kind: string, sections: Section[]): string {
  const taken = new Set(sections.map((s) => sectionId(s.heading)));
  if (!taken.has(sectionId(kind)) && !taken.has(sectionId(`${kind} 1`))) {
    return kind === 'Verse' ? 'Verse 1' : kind;
  }
  for (let n = 2; ; n++) {
    const candidate = `${kind} ${n}`;
    if (!taken.has(sectionId(candidate))) return candidate;
  }
}
