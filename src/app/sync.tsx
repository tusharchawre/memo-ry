// Mac sync (design/screens/09-mac-sync.html). Pairing, status, Needs you and recent activity.
// Behaviour: docs/spec.md "Library location and sync".
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLibraryVersion } from '@/library/events';
import { baseName, libraryStats, parentPath } from '@/library/library';
import { formatSize } from '@/library/names';
import { pair, recentActivity, resolveDecision, syncNow, unpair } from '@/sync/engine';
import { parsePairing, shortAgo } from '@/sync/format';
import type { Decision } from '@/sync/plan';
import type { ActivityKind } from '@/sync/store';
import { Button } from '@/ui/button';
import { PromptSheet } from '@/ui/sheet';
import { StatusDot, useSyncSummary } from '@/ui/sync-status';
import { Text } from '@/ui/text';
import { TopBar } from '@/ui/top-bar';
import { colors, fonts, layout } from '@/ui/tokens';

const MAC_FOLDER = '~/Music/Memo-ry';

export default function SyncScreen() {
  const insets = useSafeAreaInsets();
  const { state, text, color, now } = useSyncSummary();
  const libraryVersion = useLibraryVersion();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stats = useMemo(() => libraryStats(), [libraryVersion]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const activity = useMemo(() => (state.pairing ? recentActivity(8) : []), [state.activityVersion, state.pairing]);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteKey, setPasteKey] = useState(0);
  const paired = !!state.pairing;
  const busy = state.phase === 'syncing' || state.phase === 'checking';

  const pairWithCode = async (code: string) => {
    const p = parsePairing(code);
    if (!p) {
      Alert.alert("That isn't a Memo-ry code", 'Copy the whole code from the pairing page on the Mac.');
      return;
    }
    setPasteOpen(false);
    try {
      await pair(p);
    } catch {
      Alert.alert(`Can't reach ${p.name}`, `Is the receiver running, and are both on the same Wi-Fi? (${p.host}:${p.port})`);
    }
  };

  const confirmUnpair = () =>
    Alert.alert('Unpair this Mac?', 'Sync stops. Files stay on both the phone and the Mac.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Unpair', style: 'destructive', onPress: unpair },
    ]);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 24 }]}>
        <TopBar backLabel="Library" />
        <View style={{ gap: 8 }}>
          <Text variant="title">Mac</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <StatusDot color={color} />
            <Text variant="body" style={{ flexShrink: 1 }}>
              {text}
            </Text>
          </View>
        </View>

        <View>
          {paired ? (
            <>
              <Row label="Device" value={state.mac?.name ?? state.pairing!.name} />
              <Row label="Connection" value={`Same Wi-Fi · ${state.pairing!.host}`} />
            </>
          ) : null}
          <Row label="On the Mac" value={MAC_FOLDER} mono />
          <Row label="Library size" value={`${stats.files} files · ${formatSize(stats.bytes)}`} mono last />
        </View>

        {paired ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button label={busy ? 'Syncing…' : 'Sync now'} variant="secondary" disabled={busy} onPress={() => void syncNow()} style={{ flex: 1 }} />
            {state.phase === 'offline' || state.phase === 'unauthorized' ? (
              <Button label="Pair again" variant="secondary" onPress={() => router.push('/pair')} style={{ flex: 1 }} />
            ) : null}
          </View>
        ) : (
          <SetUp
            onScan={() => router.push('/pair')}
            onPaste={() => {
              setPasteKey((k) => k + 1);
              setPasteOpen(true);
            }}
          />
        )}

        {state.decisions.length > 0 ? (
          <View style={{ gap: 12 }}>
            <Text variant="label">Needs you</Text>
            {state.decisions.map((d) => (
              <NeedsYou key={d.id} decision={d} macName={state.mac?.name ?? state.pairing?.name ?? 'the Mac'} />
            ))}
          </View>
        ) : null}

        {activity.length > 0 ? (
          <View style={{ gap: 4 }}>
            <Text variant="label" style={{ paddingBottom: 6 }}>
              Recent
            </Text>
            {activity.map((a) => (
              <View key={a.id} style={styles.activity}>
                <View style={styles.activityIcon} accessibilityLabel={ACTIVITY[a.kind].label}>
                  <Text style={{ fontSize: 13, color: colors.secondary }}>{ACTIVITY[a.kind].glyph}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text variant="mono" style={{ color: colors.text }} numberOfLines={1}>
                    {baseName(a.path)}
                  </Text>
                  <Text variant="small" numberOfLines={1}>
                    {ACTIVITY[a.kind].verb ? `${ACTIVITY[a.kind].verb} · ` : ''}
                    {songOf(a.path)}
                  </Text>
                </View>
                <Text variant="small">{shortAgo(a.at, now)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {paired ? (
          <Pressable onPress={confirmUnpair} accessibilityRole="button" style={({ pressed }) => [styles.link, pressed && { opacity: 0.6 }]}>
            <Text variant="small">Unpair this Mac</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <PromptSheet
        key={pasteKey}
        visible={pasteOpen}
        title="Paste pairing code"
        placeholder='{"app":"memo-ry",…}'
        confirmLabel="Pair"
        onClose={() => setPasteOpen(false)}
        onSubmit={(code) => void pairWithCode(code)}
      />
    </View>
  );
}

const ACTIVITY: Record<ActivityKind, { glyph: string; label: string; verb: string }> = {
  up: { glyph: '↑', label: 'Sent to Mac', verb: '' },
  down: { glyph: '↓', label: 'From Mac', verb: '' },
  trash: { glyph: '×', label: 'Moved to the Trash on the Mac', verb: 'Trash on Mac' },
  delete: { glyph: '×', label: 'Deleted on this phone', verb: 'Deleted here' },
};

function SetUp({ onScan, onPaste }: { onScan: () => void; onPaste: () => void }) {
  const steps = [
    'On the Mac, in the memo-ry folder: bun mac/install.ts (once; it starts with the Mac from then on).',
    'Open localhost:7337/pair on the Mac.',
    'Tap Pair with Mac and scan the code. Both need the same Wi-Fi.',
  ];
  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 10 }}>
        <Text variant="label">Set up</Text>
        {steps.map((s, i) => (
          <View key={s} style={{ flexDirection: 'row', gap: 10 }}>
            <Text variant="mono" style={{ lineHeight: 22 }}>
              {i + 1}
            </Text>
            <Text variant="body" style={{ flex: 1, color: colors.secondary, lineHeight: 22 }}>
              {s}
            </Text>
          </View>
        ))}
      </View>
      <View style={{ gap: 4 }}>
        <Button label="Pair with Mac" onPress={onScan} />
        <Button label="Paste code instead" variant="ghost" onPress={onPaste} />
      </View>
    </View>
  );
}

function NeedsYou({ decision, macName }: { decision: Decision; macName: string }) {
  const [working, setWorking] = useState(false);
  const what = decision.isFolder ? `${baseName(decision.path)} (${decision.files.length} file${decision.files.length === 1 ? '' : 's'})` : baseName(decision.path);
  const where = decision.deletedOn === 'mac' ? `on ${macName}. Delete it here too?` : `on this phone. Delete it on ${macName} too?`;
  const choose = async (choice: 'keep' | 'delete') => {
    setWorking(true);
    try {
      await resolveDecision(decision, choice);
    } catch {
      Alert.alert(`Can't reach ${macName}`, 'Try again when the Mac is on the same Wi-Fi.');
    } finally {
      setWorking(false);
    }
  };
  return (
    <View style={styles.card}>
      <Text variant="body" style={{ lineHeight: 21 }}>
        <Text variant="mono" style={{ color: colors.text }}>
          {what}
        </Text>{' '}
        was deleted {where}
      </Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable disabled={working} onPress={() => void choose('keep')} accessibilityRole="button" style={({ pressed }) => [styles.choice, { backgroundColor: colors.track }, (pressed || working) && { opacity: 0.6 }]}>
          <Text style={styles.choiceLabel}>Keep</Text>
        </Pressable>
        <Pressable disabled={working} onPress={() => void choose('delete')} accessibilityRole="button" style={({ pressed }) => [styles.choice, { backgroundColor: colors.text }, (pressed || working) && { opacity: 0.6 }]}>
          <Text style={[styles.choiceLabel, { color: colors.onLight, fontFamily: fonts.medium }]}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Row({ label, value, mono, last }: { label: string; value: string; mono?: boolean; last?: boolean }) {
  return (
    <View style={[styles.row, last && { borderBottomWidth: 1, borderBottomColor: colors.hairline }]}>
      <Text variant="body" style={{ color: colors.muted }}>
        {label}
      </Text>
      <Text variant={mono ? 'mono' : 'body'} style={{ color: colors.text, flexShrink: 1 }} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

/** "Money Trees/recordings/x.m4a" -> "Money Trees". */
function songOf(path: string): string {
  let folder = parentPath(path);
  if (['recordings', 'files', 'lyrics.history'].includes(baseName(folder))) folder = parentPath(folder);
  return baseName(folder) || 'Library';
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: layout.screenX, gap: 26 },
  row: { paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16, borderTopWidth: 1, borderTopColor: colors.hairline },
  card: { padding: 14, borderRadius: 16, backgroundColor: colors.tile, gap: 12 },
  choice: { flex: 1, minHeight: 42, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  choiceLabel: { fontFamily: fonts.regular, fontSize: 14, color: colors.text },
  activity: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  activityIcon: { width: 28, height: 28, borderRadius: 999, backgroundColor: colors.tile, alignItems: 'center', justifyContent: 'center' },
  link: { minHeight: 44, alignSelf: 'center', justifyContent: 'center', paddingHorizontal: 12 },
});
