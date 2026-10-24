// Mac sync (design/screens/09-mac-sync.html). Milestone 1: where the library lives and how to sync it.
// Pairing, the sync engine, "Needs you" and activity: docs/spec.md "Library location and sync".
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { libraryStats, libraryUri } from '@/library/library';
import { formatSize } from '@/library/names';
import { Text } from '@/ui/text';
import { TopBar } from '@/ui/top-bar';
import { colors, layout } from '@/ui/tokens';

export default function SyncScreen() {
  const insets = useSafeAreaInsets();
  const stats = useMemo(() => libraryStats(), []);
  const location = decodeURIComponent(libraryUri().replace(/^file:\/\//, ''));

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 24 }]}>
      <TopBar backLabel="Library" />
      <View style={{ gap: 8 }}>
        <Text variant="title">Mac</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[styles.dot, { backgroundColor: colors.muted }]} />
          <Text variant="body">Not paired yet</Text>
        </View>
      </View>

      <View>
        <Row label="On the Mac" value="~/Music/Memo-ry" mono />
        <Row label="Library size" value={`${stats.files} files · ${formatSize(stats.bytes)}`} mono />
        <View style={[styles.row, { borderBottomWidth: 1, borderBottomColor: colors.hairline, flexDirection: 'column', alignItems: 'flex-start', paddingVertical: 14, gap: 6 }]}>
          <Text variant="body" style={{ color: colors.muted }}>
            On this phone
          </Text>
          <Text variant="monoSmall" style={{ color: colors.text, lineHeight: 16 }} selectable>
            {location}
          </Text>
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Text variant="label">Set up</Text>
        <Text variant="body" style={{ color: colors.secondary, lineHeight: 22 }}>
          Coming next: run the Memo-ry receiver on the Mac, scan its QR code here once, and every file syncs to ~/Music/Memo-ry over your Wi-Fi. No other app needed. Every song is a plain folder, so FL Studio opens the files directly.
        </Text>
      </View>
    </ScrollView>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.row}>
      <Text variant="body" style={{ color: colors.muted }}>
        {label}
      </Text>
      <Text variant={mono ? 'mono' : 'body'} style={{ color: colors.text }} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: layout.screenX, gap: 26 },
  dot: { width: 8, height: 8, borderRadius: 999 },
  row: { minHeight: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16, borderTopWidth: 1, borderTopColor: colors.hairline },
});
