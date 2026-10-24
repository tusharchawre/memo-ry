// Opening a tile and its long-press menu (rename, delete), shared by Library, Folder and Search.
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { deleteItem, parentPath, previewFile, renameItem, type Item } from '@/library/library';

import { ActionSheet, PromptSheet } from './sheet';

export function openItem(item: Item) {
  switch (item.kind) {
    case 'folder':
      router.push({ pathname: '/folder', params: { path: item.path } });
      return;
    case 'lyrics':
      router.push({ pathname: '/lyrics', params: { folder: parentPath(item.path) } });
      return;
    case 'audio':
      router.push({ pathname: '/player', params: { path: item.path } });
      return;
    default:
      previewFile(item.path).then((ok) => {
        if (!ok) Alert.alert('No preview', `This phone can't open .${item.ext || 'this'} files. It's still in the folder and syncs to the Mac.`);
      });
  }
}

export function useItemMenu() {
  const [target, setTarget] = useState<Item | null>(null);
  const [mode, setMode] = useState<'menu' | 'rename' | null>(null);

  const close = () => {
    setMode(null);
    setTarget(null);
  };

  const confirmDelete = (item: Item) => {
    close();
    const what = item.kind === 'folder' ? `"${item.title}" and everything in it` : `"${item.title}"`;
    Alert.alert('Delete?', `This deletes ${what} here and on the Mac.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteItem(item) },
    ]);
  };

  const element = target ? (
    <>
      <ActionSheet
        visible={mode === 'menu'}
        title={target.title}
        onClose={close}
        actions={[
          { label: 'Rename', onPress: () => setMode('rename') },
          { label: 'Delete', destructive: true, onPress: () => confirmDelete(target) },
        ]}
      />
      <PromptSheet
        key={`rename-${target.path}`}
        visible={mode === 'rename'}
        title="Rename"
        initial={target.title}
        confirmLabel="Rename"
        onClose={close}
        onSubmit={(name) => {
          renameItem(target, name);
          close();
        }}
      />
    </>
  ) : null;

  return {
    element,
    open: (item: Item) => {
      setTarget(item);
      setMode('menu');
    },
  };
}
