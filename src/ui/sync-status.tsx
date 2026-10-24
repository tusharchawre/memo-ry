// One status line for Mac sync, shared by the Library footer and the Mac screen (09-mac-sync.html).
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { useSyncState, type SyncState } from '@/sync/engine';
import { timeAgo } from '@/sync/format';

import { colors } from './tokens';

/** Current time, refreshed every `ms` so "2 min ago" keeps up. */
export function useNow(ms = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

export type SyncSummary = { color: string; text: string; footer: string };

export function summarize(s: SyncState, now: number): SyncSummary {
  const mac = s.mac?.name ?? s.pairing?.name ?? 'Mac';
  const ago = s.lastSynced ? timeAgo(s.lastSynced, now) : null;
  const needs = s.decisions.length ? ` · ${s.decisions.length} need${s.decisions.length === 1 ? 's' : ''} you` : '';
  switch (s.phase) {
    case 'unpaired':
      return { color: colors.muted, text: 'Not paired yet', footer: 'Mac sync: not set up yet' };
    case 'syncing': {
      const text = `Syncing · ${Math.min(s.done + 1, s.total)} of ${s.total}`;
      return { color: colors.text, text, footer: `${text} with ${mac}` };
    }
    case 'offline':
      return { color: colors.record, text: `Can't reach ${mac}${ago ? ` · synced ${ago}` : ''}`, footer: `Can't reach ${mac}${needs}` };
    case 'unauthorized':
      return { color: colors.record, text: `${mac} didn't accept this phone`, footer: `${mac} didn't accept this phone · pair again` };
    default:
      if (!ago) return { color: colors.muted, text: `Checking with ${mac}…`, footer: `Checking with ${mac}…` };
      if (s.failed) {
        const text = `${s.failed} file${s.failed === 1 ? '' : 's'} didn't sync · will retry`;
        return { color: colors.warning, text, footer: text };
      }
      return { color: colors.synced, text: `Up to date · synced ${ago}`, footer: `Synced to ${mac} · ${ago}${needs}` };
  }
}

export function useSyncSummary(): SyncSummary & { state: SyncState; now: number } {
  const state = useSyncState();
  const now = useNow();
  return { ...summarize(state, now), state, now };
}

export function StatusDot({ color, size = 8 }: { color: string; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: 999, backgroundColor: color }} />;
}
