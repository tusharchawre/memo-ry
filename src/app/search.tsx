// Search (design/screens/08-search.html): names, lyrics and notes across the library.
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLibraryVersion } from '@/library/events';
import { searchLibrary, type SearchHit } from '@/library/library';
import { formatDuration, seededPeaks } from '@/library/names';
import { AudioIcon, DocIcon, FolderIcon, ImageIcon, SearchIcon } from '@/ui/icons';
import { openItem } from '@/ui/item-actions';
import { Text } from '@/ui/text';
import { colors, fonts, layout } from '@/ui/tokens';
import { thin, Waveform } from '@/ui/waveform';

const TABS = ['All', 'Lyrics', 'Audio', 'Files', 'Folders'] as const;
type Tab = (typeof TABS)[number];

function tabOf(hit: SearchHit): Exclude<Tab, 'All'> {
  const k = hit.item.kind;
  if (k === 'folder') return 'Folders';
  if (k === 'lyrics' || k === 'text') return 'Lyrics';
  if (k === 'audio') return 'Audio';
  return 'Files';
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('All');
  const version = useLibraryVersion();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const hits = useMemo(() => searchLibrary(query), [query, version]);
  const counts = useMemo(() => {
    const c: Record<Tab, number> = { All: hits.length, Lyrics: 0, Audio: 0, Files: 0, Folders: 0 };
    for (const h of hits) c[tabOf(h)]++;
    return c;
  }, [hits]);
  const shown = tab === 'All' ? hits : hits.filter((h) => tabOf(h) === tab);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 18 }]}>
      <View style={styles.searchRow}>
        <View style={styles.field}>
          <SearchIcon />
          <TextInput
            value={query}
            onChangeText={setQuery}
            autoFocus
            placeholder="Search"
            placeholderTextColor={colors.muted}
            returnKeyType="search"
            autoCorrect={false}
            style={styles.input}
            accessibilityLabel="Search"
          />
        </View>
        <Pressable onPress={() => router.back()} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}>
          <Text variant="body" style={{ color: colors.secondary }}>
            Cancel
          </Text>
        </Pressable>
      </View>

      {query.trim() ? (
        <View style={styles.tabs}>
          {TABS.map((t) =>
            t === 'All' || counts[t] > 0 ? (
              <Pressable key={t} onPress={() => setTab(t)} accessibilityRole="tab" accessibilityState={{ selected: tab === t }} style={[styles.tab, tab === t && styles.tabActive]}>
                <Text style={[styles.tabText, tab === t && { color: colors.text, fontFamily: fonts.medium }]}>
                  {t} {counts[t]}
                </Text>
              </Pressable>
            ) : null,
          )}
        </View>
      ) : null}

      <FlatList
        data={shown}
        keyExtractor={(h, i) => `${h.item.path}-${h.field}-${h.section ?? ''}-${i}`}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: layout.screenX, paddingTop: 6, paddingBottom: insets.bottom + 24 }}
        renderItem={({ item: hit }) => <HitRow hit={hit} query={query.trim()} />}
        ListEmptyComponent={
          <Text variant="small" style={{ textAlign: 'center', marginTop: 32 }}>
            {query.trim() ? 'Nothing matches.' : 'Searches names, lyrics and notes'}
          </Text>
        }
      />
    </View>
  );
}

function HitRow({ hit, query }: { hit: SearchHit; query: string }) {
  const { item } = hit;
  const label = item.kind === 'folder' ? null : hit.field === 'name' ? (item.kind === 'audio' && item.recording?.durationSec ? formatDuration(item.recording.durationSec) : null) : (hit.section ?? hit.field).toUpperCase();
  return (
    <Pressable onPress={() => openItem(item)} accessibilityRole="button" style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
      <Thumb hit={hit} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text variant="bodyMedium" numberOfLines={1}>
          {hit.field === 'name' ? <Highlighted text={item.kind === 'lyrics' ? item.name : hit.snippet} query={query} /> : item.kind === 'lyrics' ? item.name : item.title}
          {label ? <Text variant="monoSmall"> · {label}</Text> : null}
        </Text>
        {hit.field !== 'name' ? (
          <Text variant="body" numberOfLines={2} style={{ fontSize: 14, lineHeight: 20, color: colors.secondary }}>
            <Highlighted text={hit.snippet} query={query} />
          </Text>
        ) : null}
        <Text variant="monoSmall" numberOfLines={1}>
          {hit.folder ? `${hit.folder}/` : 'Library/'}
        </Text>
      </View>
    </Pressable>
  );
}

function Highlighted({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const parts: { s: string; hit: boolean }[] = [];
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  let i = 0;
  while (i < text.length) {
    const at = lower.indexOf(q, i);
    if (at < 0) {
      parts.push({ s: text.slice(i), hit: false });
      break;
    }
    if (at > i) parts.push({ s: text.slice(i, at), hit: false });
    parts.push({ s: text.slice(at, at + q.length), hit: true });
    i = at + q.length;
  }
  return (
    <>
      {parts.map((p, j) =>
        p.hit ? (
          <Text key={j} style={styles.mark}>
            {p.s}
          </Text>
        ) : (
          p.s
        ),
      )}
    </>
  );
}

function Thumb({ hit }: { hit: SearchHit }) {
  const { item } = hit;
  let inner;
  if (item.kind === 'image') inner = <Image source={{ uri: item.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />;
  else if (item.kind === 'audio')
    inner = item.recording?.peaks?.length || item.name ? (
      <Waveform peaks={thin(item.recording?.peaks?.length ? item.recording.peaks : seededPeaks(item.name), 8)} height={30} style={{ paddingHorizontal: 9, alignSelf: 'stretch' }} />
    ) : (
      <AudioIcon size={22} />
    );
  else if (item.kind === 'folder') inner = <FolderIcon size={24} />;
  else if (item.kind === 'video') inner = <ImageIcon size={22} />;
  else inner = <DocIcon size={22} />;
  return <View style={styles.thumb}>{inner}</View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  searchRow: { paddingHorizontal: layout.screenX, flexDirection: 'row', alignItems: 'center', gap: 12 },
  field: { flex: 1, minHeight: 42, paddingHorizontal: 12, borderRadius: 12, backgroundColor: colors.tile, flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 16, color: colors.text, paddingVertical: 8 },
  tabs: { marginTop: 14, marginHorizontal: layout.screenX, flexDirection: 'row', gap: 18, borderBottomWidth: 1, borderBottomColor: colors.hairline },
  tab: { paddingVertical: 8, marginBottom: -1, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.text },
  tabText: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
  row: { flexDirection: 'row', gap: 14, alignItems: 'flex-start', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#141414' },
  thumb: { width: 48, height: 48, borderRadius: 12, backgroundColor: colors.tile, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  mark: { backgroundColor: colors.handle, color: '#FFFFFF' },
});
