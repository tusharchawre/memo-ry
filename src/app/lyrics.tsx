// lyrics.md editor: a plain black page (design/screens/03-lyrics.html). Autosaves.
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLibraryVersion } from '@/library/events';
import { readLyrics, sectionLinks, writeLyrics } from '@/library/library';
import { nextHeading, SECTION_KINDS, sectionId, type Lyrics } from '@/lyrics/lyrics';
import { IconButton } from '@/ui/button';
import { BackIcon, PlayIcon } from '@/ui/icons';
import { ActionSheet } from '@/ui/sheet';
import { Text, textStyles } from '@/ui/text';
import { colors, fonts } from '@/ui/tokens';

const SAVE_DELAY_MS = 600;

export default function LyricsScreen() {
  const { folder = '' } = useLocalSearchParams<{ folder: string }>();
  const insets = useSafeAreaInsets();
  const [lyrics, setLyrics] = useState<Lyrics>(() => readLyrics(folder));
  const [focused, setFocused] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [menuFor, setMenuFor] = useState<number | null>(null);
  const dirty = useRef(false);
  const latest = useRef(lyrics);

  const version = useLibraryVersion();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const links = useMemo(() => sectionLinks(folder), [folder, version]);

  // Debounced autosave, plus a final save when leaving.
  useEffect(() => {
    if (!dirty.current) return;
    const t = setTimeout(() => {
      writeLyrics(folder, latest.current);
      dirty.current = false;
    }, SAVE_DELAY_MS);
    return () => clearTimeout(t);
  }, [lyrics, folder]);
  useEffect(
    () => () => {
      if (dirty.current) writeLyrics(folder, latest.current);
    },
    [folder],
  );

  const update = (next: Lyrics) => {
    dirty.current = true;
    latest.current = next;
    setLyrics(next);
  };
  const updateSection = (i: number, patch: Partial<Lyrics['sections'][number]>) =>
    update({ ...lyrics, sections: lyrics.sections.map((s, j) => (j === i ? { ...s, ...patch } : s)) });

  const addSection = (kind: string) => {
    setAdding(false);
    update({ ...lyrics, sections: [...lyrics.sections, { heading: nextHeading(kind, lyrics.sections), body: '', note: '' }] });
  };

  const moveSection = (i: number, delta: number) => {
    const j = i + delta;
    if (j < 0 || j >= lyrics.sections.length) return;
    const sections = [...lyrics.sections];
    [sections[i], sections[j]] = [sections[j], sections[i]];
    update({ ...lyrics, sections });
  };

  const menuSection = menuFor !== null ? lyrics.sections[menuFor] : null;

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <IconButton label="Back to folder" onPress={() => router.back()}>
          <BackIcon />
        </IconButton>
        <Text variant="mono">lyrics.md</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
        <TextInput
          value={lyrics.title}
          onChangeText={(title) => update({ ...lyrics, title })}
          style={styles.title}
          placeholder="Title"
          placeholderTextColor={colors.faint}
          accessibilityLabel="Song title"
        />

        {lyrics.sections.map((s, i) => {
          const link = links.get(sectionId(s.heading));
          const showNote = !!s.note || focused === i;
          return (
            <View key={i} style={{ gap: 8 }}>
              <View style={styles.labelRow}>
                <Pressable onLongPress={() => setMenuFor(i)} onPress={() => setMenuFor(i)} accessibilityRole="button" accessibilityLabel={`${s.heading} section options`} hitSlop={10}>
                  <Text variant="section">{s.heading.toUpperCase()}</Text>
                </Pressable>
                {link ? (
                  <Pressable
                    onPress={() => router.push({ pathname: '/player', params: { path: link.path } })}
                    accessibilityRole="button"
                    accessibilityLabel={`Play ${link.title}`}
                    hitSlop={10}
                    style={styles.link}
                  >
                    <PlayIcon size={9} color={colors.secondary} />
                    <Text variant="monoSmall" style={{ color: colors.secondary }}>
                      {link.name.replace(/^\d{4}-\d{2}-\d{2} /, '')}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
              <TextInput
                value={s.body}
                onChangeText={(body) => updateSection(i, { body })}
                onFocus={() => setFocused(i)}
                multiline
                scrollEnabled={false}
                placeholder="…"
                placeholderTextColor={colors.handle}
                style={styles.body}
                accessibilityLabel={`${s.heading} lyrics`}
              />
              {showNote ? (
                <View style={styles.noteRow}>
                  <Text style={styles.noteDash}>—</Text>
                  <TextInput
                    value={s.note}
                    onChangeText={(note) => updateSection(i, { note })}
                    onFocus={() => setFocused(i)}
                    multiline
                    scrollEnabled={false}
                    placeholder="note: meaning, mood, beat idea"
                    placeholderTextColor={colors.faint}
                    style={styles.note}
                    accessibilityLabel={`${s.heading} note`}
                  />
                </View>
              ) : null}
            </View>
          );
        })}

        {adding ? (
          <View style={styles.kinds}>
            {SECTION_KINDS.map((k) => (
              <Pressable key={k} onPress={() => addSection(k)} accessibilityRole="button" style={styles.kind}>
                <Text variant="body" style={{ fontSize: 14, color: colors.secondary }}>
                  {k}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Pressable onPress={() => setAdding(true)} accessibilityRole="button" hitSlop={12} style={{ alignSelf: 'flex-start' }}>
            <Text variant="mono" style={{ fontSize: 12 }}>
              + section
            </Text>
          </Pressable>
        )}
      </ScrollView>

      {menuSection && menuFor !== null ? (
        <ActionSheet
          visible
          title={menuSection.heading}
          onClose={() => setMenuFor(null)}
          actions={[
            { label: 'Move up', onPress: () => (moveSection(menuFor, -1), setMenuFor(null)) },
            { label: 'Move down', onPress: () => (moveSection(menuFor, 1), setMenuFor(null)) },
            {
              label: 'Delete section',
              destructive: true,
              onPress: () => {
                update({ ...lyrics, sections: lyrics.sections.filter((_, j) => j !== menuFor) });
                setMenuFor(null);
              },
            },
          ]}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  topBar: { paddingHorizontal: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  content: { paddingHorizontal: 28, paddingTop: 18, gap: 28 },
  title: { fontFamily: fonts.semibold, fontSize: 26, letterSpacing: -0.5, color: colors.text, padding: 0 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  body: { ...textStyles.lyric, padding: 0, textAlignVertical: 'top' },
  noteRow: { flexDirection: 'row', gap: 6 },
  noteDash: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.muted },
  note: { flex: 1, fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.muted, padding: 0 },
  kinds: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  kind: { minHeight: 36, paddingHorizontal: 13, borderRadius: 999, backgroundColor: colors.input, justifyContent: 'center' },
});
