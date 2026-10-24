// Library root (design/screens/01-library.html).
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useFolder, useRecentFiles } from '@/library/hooks';
import { baseName, createFolder, parentPath } from '@/library/library';
import { IconButton } from '@/ui/button';
import { Grid } from '@/ui/grid';
import { LaptopIcon, PlusIcon, SearchIcon } from '@/ui/icons';
import { openItem, useItemMenu } from '@/ui/item-actions';
import { PromptSheet } from '@/ui/sheet';
import { Text } from '@/ui/text';
import { Tile } from '@/ui/tile';
import { colors, layout } from '@/ui/tokens';

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const listing = useFolder('');
  const recent = useRecentFiles(3);
  const menu = useItemMenu();
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [promptKey, setPromptKey] = useState(0);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 18 }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text variant="title">Library</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <IconButton label="Mac sync" size={40} onPress={() => router.push('/sync')}>
              <LaptopIcon />
              <View style={styles.syncDot} />
            </IconButton>
            <IconButton
              label="New folder"
              size={40}
              background={colors.text}
              onPress={() => {
                setPromptKey((k) => k + 1);
                setNewFolderOpen(true);
              }}
            >
              <PlusIcon color={colors.onLight} />
            </IconButton>
          </View>
        </View>

        <Pressable onPress={() => router.push('/search')} accessibilityRole="search" style={styles.search}>
          <SearchIcon />
          <Text variant="body" style={{ color: colors.muted }}>
            Search
          </Text>
        </Pressable>

        <View style={{ gap: 12 }}>
          <View style={styles.rowBetween}>
            <Text variant="label">Folders</Text>
            <Text variant="label">Recent ↓</Text>
          </View>
          <Grid items={listing.folders} render={(f) => <Tile item={f} onPress={() => openItem(f)} onLongPress={f.isInbox ? undefined : () => menu.open(f)} />} />
        </View>

        {recent.length > 0 ? (
          <View style={{ gap: 12 }}>
            <Text variant="label">Recent files</Text>
            <Grid
              items={recent}
              render={(f) => <Tile item={f} subtitle={songOf(f.path)} onPress={() => openItem(f)} onLongPress={() => menu.open(f)} />}
            />
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.footerDot} />
        <Text variant="small">Mac sync: not set up yet</Text>
      </View>

      <PromptSheet
        key={promptKey}
        visible={newFolderOpen}
        title="New folder"
        placeholder="Song or album name"
        confirmLabel="Create"
        onClose={() => setNewFolderOpen(false)}
        onSubmit={(name) => {
          setNewFolderOpen(false);
          const path = createFolder('', name);
          router.push({ pathname: '/folder', params: { path } });
        }}
      />
      {menu.element}
    </View>
  );
}

/** The song folder a file belongs to: "Money Trees/recordings/x.m4a" -> "Money Trees". */
function songOf(path: string): string {
  let folder = parentPath(path);
  if (['recordings', 'files'].includes(baseName(folder))) folder = parentPath(folder);
  return baseName(folder) || 'Library';
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: layout.screenX, paddingBottom: 24, gap: 18 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  search: { minHeight: 42, paddingHorizontal: 14, borderRadius: 12, backgroundColor: colors.tile, flexDirection: 'row', alignItems: 'center', gap: 10 },
  syncDot: { position: 'absolute', top: 9, right: 8, width: 7, height: 7, borderRadius: 999, backgroundColor: colors.muted, borderWidth: 2, borderColor: colors.background },
  footer: { paddingTop: 10, paddingHorizontal: layout.screenX, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, borderTopWidth: 1, borderTopColor: colors.hairline },
  footerDot: { width: 6, height: 6, borderRadius: 999, backgroundColor: colors.muted },
});
