// A tiny change bus: library writes call notifyLibraryChanged(), screens re-read via useLibraryVersion().
import { useSyncExternalStore } from 'react';

let version = 0;
const listeners = new Set<() => void>();

export function notifyLibraryChanged() {
  version++;
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useLibraryVersion(): number {
  return useSyncExternalStore(subscribe, () => version);
}
