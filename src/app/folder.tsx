// A folder: song, album or Inbox (design/screens/02-folder.html, 07-add-to-folder.html).
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useFolder } from '@/library/hooks';
import { createFolder, folderTitle, importFiles, parentPath, setStatus, STATUSES, type Item, type Status } from '@/library/library';
import { Button } from '@/ui/button';
import { Grid } from '@/ui/grid';
import { DocIcon, FolderIcon, ImageIcon, PenIcon, PlusIcon } from '@/ui/icons';
import { openItem, useItemMenu } from '@/ui/item-actions';
import { PromptSheet, Sheet } from '@/ui/sheet';
import { Text } from '@/ui/text';
import { Tile } from '@/ui/tile';
import { TopBar } from '@/ui/top-bar';
import { colors, fonts, layout, statusColors } from '@/ui/tokens';

const FILTERS = ['All', 'Lyrics', 'Audio', 'Files'] as const;
type Filter = (typeof FILTERS)[number];

const STATUS_LABEL: Record<Status, string> = { idea: 'Idea', writing: 'Writing', producing: 'Producing', done: 'Done' };

function matches(item: Item, filter: Filter): boolean {
  if (filter === 'All') return true;
  if (filter === 'Lyrics') return item.kind === 'lyrics';
  if (filter === 'Audio') return item.kind === 'audio';
  return item.kind !== 'lyrics' && item.kind !== 'audio' && item.kind !== 'folder';
}

export default function FolderScreen() {
  const { path = '' } = useLocalSearchParams<{ path: string }>();
  const insets = useSafeAreaInsets();
  const listing = useFolder(path);
  const menu = useItemMenu();
  const [filter, setFilter] = useState<Filter>('All');
  const [addOpen, setAddOpen] = useState(false);
  const [newFolderOpen, setNewFolderOpen] = useState(false);

  const all = [...listing.folders, ...listing.files];
  const visible = filter === 'All' ? all : listing.files.filter((i) => matches(i, filter));
  const status = listing.meta.status;

  const cycleStatus = () => {
    const i = status ? STATUSES.indexOf(status) : -1;
    setStatus(path, i + 1 < STATUSES.length ? STATUSES[i + 1] : undefined);
  };

  const pickFiles = async () => {
    setAddOpen(false);
    const res = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true, type: '*/*' });
    if (!res.canceled) importFiles(path, res.assets.map((a) => ({ uri: a.uri, name: a.name })));
  };

  const pickMedia = async () => {
    setAddOpen(false);
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], allowsMultipleSelection: true, quality: 1 });
    if (!res.canceled) importFiles(path, res.assets.map((a) => ({ uri: a.uri, name: a.fileName })));
  };

  if (!listing.exists) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 10, paddingHorizontal: layout.screenX }]}>
        <TopBar backLabel="Library" />
        <Text variant="body" style={{ marginTop: 24, color: colors.muted }}>
          This folder was moved or deleted.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 10 }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TopBar backLabel={folderTitle(parentPath(path))} />

        <View style={{ gap: 10 }}>
          <Text variant="title">{folderTitle(path)}</Text>
          <View style={{ flexDirection: 'row' }}>
            <Pressable onPress={cycleStatus} accessibilityRole="button" accessibilityLabel={`Status: ${status ? STATUS_LABEL[status] : 'none'}. Tap to change.`} style={styles.chip}>
              {status ? <View style={[styles.dot, { backgroundColor: statusColors[status] }]} /> : null}
              <Text style={styles.chipText}>{status ? STATUS_LABEL[status] : '+ status'}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.tabs}>
          {FILTERS.map((f) => (
            <Pressable key={f} onPress={() => setFilter(f)} accessibilityRole="tab" accessibilityState={{ selected: filter === f }} style={[styles.tab, filter === f && styles.tabActive]}>
              <Text style={[styles.tabText, filter === f && { color: colors.text, fontFamily: fonts.medium }]}>{f}</Text>
            </Pressable>
          ))}
          <View style={{ flex: 1 }} />
          <Text variant="label" style={{ paddingVertical: 8 }}>
            {visible.length === 1 ? '1 item' : `${visible.length} items`}
          </Text>
        </View>

        {visible.length > 0 ? (
          <Grid items={visible} render={(item) => <Tile item={item} onPress={() => openItem(item)} onLongPress={() => menu.open(item)} />} />
        ) : (
          <Text variant="body" style={{ color: colors.muted, lineHeight: 22 }}>
            {filter === 'All' ? 'Empty. Record a melody, write lyrics or add files.' : `No ${filter.toLowerCase()} here yet.`}
          </Text>
        )}
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 14 }]}>
        <Button variant="secondary" label="Add" icon={<PlusIcon size={15} />} onPress={() => setAddOpen(true)} style={{ flex: 1 }} />
        <Pressable
          onPress={() => router.push({ pathname: '/record', params: { folder: path } })}
          accessibilityRole="button"
          accessibilityLabel="Record into this folder"
          style={({ pressed }) => [styles.recordRing, pressed && { opacity: 0.7 }]}
        >
          <View style={styles.recordDot} />
        </Pressable>
        <Button
          variant="secondary"
          label="Write"
          icon={<PenIcon />}
          onPress={() => router.push({ pathname: '/lyrics', params: { folder: path } })}
          style={{ flex: 1 }}
        />
      </View>

      <Sheet visible={addOpen} onClose={() => setAddOpen(false)}>
        <View>
          <Text variant="sheetTitle">Add to {folderTitle(path)}</Text>
          <Text variant="label" style={{ marginTop: 4 }}>
            Any file type. It&apos;s copied into this folder.
          </Text>
        </View>
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <AddOption
              label="Record"
              icon={
                <View style={styles.smallRing}>
                  <View style={styles.smallDot} />
                </View>
              }
              onPress={() => {
                setAddOpen(false);
                router.push({ pathname: '/record', params: { folder: path } });
              }}
            />
            <AddOption label="From Files" icon={<FolderIcon size={26} color={colors.text} strokeWidth={1.6} />} onPress={pickFiles} />
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <AddOption label="Photos & videos" icon={<ImageIcon size={26} color={colors.text} strokeWidth={1.6} />} onPress={pickMedia} />
            <AddOption
              label="Lyrics"
              icon={<DocIcon size={26} color={colors.text} strokeWidth={1.6} />}
              onPress={() => {
                setAddOpen(false);
                router.push({ pathname: '/lyrics', params: { folder: path } });
              }}
            />
          </View>
        </View>
        <Pressable
          onPress={() => {
            setAddOpen(false);
            setNewFolderOpen(true);
          }}
          accessibilityRole="button"
          style={styles.newFolderRow}
        >
          <FolderIcon size={20} color={colors.text} strokeWidth={1.6} plus />
          <Text variant="body">New folder inside</Text>
        </Pressable>
        <Button label="Cancel" variant="ghost" onPress={() => setAddOpen(false)} />
      </Sheet>

      <PromptSheet
        key={`new-${newFolderOpen}`}
        visible={newFolderOpen}
        title="New folder"
        placeholder="Song name"
        confirmLabel="Create"
        onClose={() => setNewFolderOpen(false)}
        onSubmit={(name) => {
          setNewFolderOpen(false);
          try {
            createFolder(path, name);
          } catch (e) {
            Alert.alert("Couldn't create the folder", String(e));
          }
        }}
      />
      {menu.element}
    </View>
  );
}

function AddOption({ label, icon, onPress }: { label: string; icon: ReactNode; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.option, pressed && { opacity: 0.7 }]}>
      {icon}
      <Text variant="bodyMedium">{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: layout.screenX, paddingBottom: 24, gap: 16 },
  chip: { minHeight: 28, paddingHorizontal: 10, borderRadius: 999, backgroundColor: colors.tile, flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipText: { fontFamily: fonts.regular, fontSize: 12, color: colors.text },
  dot: { width: 6, height: 6, borderRadius: 999 },
  tabs: { flexDirection: 'row', gap: 18, borderBottomWidth: 1, borderBottomColor: colors.hairline },
  tab: { paddingVertical: 8, marginBottom: -1, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.text },
  tabText: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
  bottomBar: { paddingTop: 12, paddingHorizontal: layout.screenX, flexDirection: 'row', alignItems: 'center', gap: 16 },
  recordRing: { width: 64, height: 64, borderRadius: 999, borderWidth: 3, borderColor: colors.text, alignItems: 'center', justifyContent: 'center' },
  recordDot: { width: 48, height: 48, borderRadius: 999, backgroundColor: colors.record },
  option: { flex: 1, minHeight: 104, padding: 14, borderRadius: 18, backgroundColor: colors.input, justifyContent: 'space-between' },
  smallRing: { width: 28, height: 28, borderRadius: 999, borderWidth: 2, borderColor: colors.text, alignItems: 'center', justifyContent: 'center' },
  smallDot: { width: 16, height: 16, borderRadius: 999, backgroundColor: colors.record },
  newFolderRow: { minHeight: 50, paddingHorizontal: 16, borderRadius: 14, backgroundColor: colors.input, flexDirection: 'row', alignItems: 'center', gap: 12 },
});
