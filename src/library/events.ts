// A tiny change bus: library writes call notifyLibraryChanged(), screens re-read via useLibraryVersion(),
// and the sync engine listens to schedule a sync (src/sync/engine.ts).
import { useSyncExternalStore } from 'react';

type Listener = (fromSync: boolean) => void;

let version = 0;
const listeners = new Set<Listener>();

/** `fromSync`: the change came from the sync engine itself, so it must not schedule another sync. */
export function notifyLibraryChanged(fromSync = false) {
  version++;
  for (const l of listeners) l(fromSync);
}

export function subscribeLibrary(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useLibraryVersion(): number {
  return useSyncExternalStore(subscribeLibrary, () => version);
}
