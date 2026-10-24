import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';

import { useLibraryVersion } from './events';
import { listFolder, recentFiles, type FolderListing, type Item } from './library';

/** Re-read on focus too: a sync may have changed files while we were away. */
function useRefreshKey(): number {
  const version = useLibraryVersion();
  const [focusTick, setFocusTick] = useState(0);
  useFocusEffect(useCallback(() => setFocusTick((t) => t + 1), []));
  return version * 1000 + focusTick;
}

export function useFolder(path: string): FolderListing {
  const key = useRefreshKey();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => listFolder(path), [path, key]);
}

export function useRecentFiles(limit = 3): Item[] {
  const key = useRefreshKey();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => recentFiles(limit), [limit, key]);
}
