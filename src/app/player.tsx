// Player (design/screens/06-player.html). A–B loop region is milestone 3; loop here repeats the whole file.
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, type AudioPlayer } from 'expo-audio';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLibraryVersion } from '@/library/events';
import { baseName, folderTitle, getItem, parentPath } from '@/library/library';
import { formatDuration, formatSize, seededPeaks } from '@/library/names';
import { IconButton } from '@/ui/button';
import { BackIcon, ChevronIcon, LoopIcon, PauseIcon, PlayIcon } from '@/ui/icons';
import { Text } from '@/ui/text';
import { colors, fonts, layout } from '@/ui/tokens';
import { thin, Waveform } from '@/ui/waveform';

const SPEEDS = [1, 1.25, 1.5, 2, 0.5, 0.75];

function songFolder(path: string): string {
  let folder = parentPath(path);
  if (['recordings', 'files'].includes(baseName(folder))) folder = parentPath(folder);
  return folder;
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

export default function PlayerScreen() {
  const { path = '' } = useLocalSearchParams<{ path: string }>();
  const insets = useSafeAreaInsets();
  const version = useLibraryVersion();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const item = useMemo(() => getItem(path), [path, version]);
  const player = useAudioPlayer(item ? { uri: item.uri } : null, { updateInterval: 100 });
  const status = useAudioPlayerStatus(player);
  const [loop, setLoop] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [waveWidth, setWaveWidth] = useState(1);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
  }, []);

  if (!item) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 10, paddingHorizontal: layout.screenX }]}>
        <IconButton label="Back" onPress={() => router.back()}>
          <BackIcon />
        </IconButton>
        <Text variant="body" style={{ color: colors.muted, marginTop: 24 }}>
          This file was moved or deleted.
        </Text>
      </View>
    );
  }

  const folder = songFolder(path);
  const peaks = thin(item.recording?.peaks?.length ? item.recording.peaks : seededPeaks(item.name), 54);
  const duration = status.duration || item.recording?.durationSec || 0;
  const progress = duration > 0 ? status.currentTime / duration : 0;

  const togglePlay = () => {
    if (status.playing) return player.pause();
    if (duration > 0 && status.currentTime >= duration - 0.05) player.seekTo(0);
    player.play();
  };
  const seekBy = (delta: number) => player.seekTo(Math.min(Math.max(0, status.currentTime + delta), duration));
  const seekAt = (e: GestureResponderEvent) => {
    if (duration > 0) player.seekTo(Math.min(1, Math.max(0, e.nativeEvent.locationX / waveWidth)) * duration);
  };
  const toggleLoop = () => {
    setPlayerLoop(player, !loop);
    setLoop(!loop);
  };
  const nextSpeed = () => {
    const i = (speedIndex + 1) % SPEEDS.length;
    player.setPlaybackRate(SPEEDS[i]);
    setSpeedIndex(i);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 10 }]}>
      <View style={styles.top}>
        <IconButton label="Back to folder" onPress={() => router.back()}>
          <BackIcon />
        </IconButton>
        <Text variant="mono" numberOfLines={1} style={{ flex: 1, textAlign: 'center' }}>
          {item.name}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={{ paddingHorizontal: layout.screenX, paddingTop: 28, gap: 6 }}>
        <Text variant="title" numberOfLines={2}>
          {item.title}
        </Text>
        <Text variant="body" style={{ fontSize: 14, color: colors.muted }}>
          {[folderTitle(folder), formatDate(item.recording?.createdAt)].filter(Boolean).join(' · ')}
        </Text>
      </View>

      <View style={{ paddingHorizontal: layout.screenX, paddingTop: 36, gap: 12 }}>
        <Pressable onPress={seekAt} onLayout={(e) => setWaveWidth(e.nativeEvent.layout.width || 1)} accessibilityRole="adjustable" accessibilityLabel="Seek" style={{ height: 120, justifyContent: 'center' }}>
          <Waveform peaks={peaks} height={120} barWidth={3} colorAt={(i, n) => (i / n < progress ? colors.text : colors.handle)} style={{ paddingHorizontal: 6 }} />
          <View style={[styles.playhead, { left: `${progress * 100}%` }]} />
        </Pressable>
        <View style={styles.times}>
          <Text variant="mono" style={{ fontSize: 12 }}>
            {formatDuration(status.currentTime)}
          </Text>
          <Text variant="mono" style={{ fontSize: 12 }}>
            {formatDuration(duration)}
          </Text>
        </View>
      </View>

      <View style={styles.controls}>
        <IconButton label={loop ? 'Loop on' : 'Loop off'} size={48} background={loop ? colors.text : colors.tile} onPress={toggleLoop}>
          <LoopIcon color={loop ? colors.onLight : colors.text} />
        </IconButton>
        <IconButton label="Back 5 seconds" size={48} onPress={() => seekBy(-5)}>
          <Text style={styles.monoBtn}>−5</Text>
        </IconButton>
        <IconButton label={status.playing ? 'Pause' : 'Play'} size={72} background={colors.text} onPress={togglePlay}>
          {status.playing ? <PauseIcon size={22} /> : <PlayIcon size={22} />}
        </IconButton>
        <IconButton label="Forward 5 seconds" size={48} onPress={() => seekBy(5)}>
          <Text style={styles.monoBtn}>+5</Text>
        </IconButton>
        <IconButton label="Playback speed" size={48} background={colors.tile} onPress={nextSpeed}>
          <Text style={styles.monoBtn}>{SPEEDS[speedIndex]}×</Text>
        </IconButton>
      </View>

      <View style={{ flex: 1 }} />

      <View style={{ paddingHorizontal: layout.screenX, paddingBottom: insets.bottom + 16 }}>
        {item.recording?.note ? <InfoRow label="Note" value={item.recording.note} /> : null}
        {item.recording?.linkedSection ? (
          <InfoRow label="Goes with" value={headingOf(item.recording.linkedSection)} onPress={() => router.push({ pathname: '/lyrics', params: { folder } })} />
        ) : null}
        <InfoRow label="File" value={`${item.ext} · ${formatSize(item.size)}`} mono />
        <InfoRow label="Folder" value={folderTitle(folder)} onPress={() => router.back()} />
      </View>
    </View>
  );
}

/** expo-audio's player is a native object; setting `loop` on it is how the API works. */
function setPlayerLoop(player: AudioPlayer, loop: boolean) {
  player.loop = loop;
}

function headingOf(id: string): string {
  const words = id.split('-');
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function InfoRow({ label, value, mono, onPress }: { label: string; value: string; mono?: boolean; onPress?: () => void }) {
  const content = (
    <>
      <Text variant="body" style={{ color: colors.muted }}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
        <Text variant={mono ? 'mono' : 'body'} numberOfLines={1} style={mono ? { color: colors.text } : { flexShrink: 1 }}>
          {value}
        </Text>
        {onPress ? <ChevronIcon /> : null}
      </View>
    </>
  );
  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="button" style={styles.infoRow}>
      {content}
    </Pressable>
  ) : (
    <View style={styles.infoRow}>{content}</View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  top: { paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center' },
  playhead: { position: 'absolute', top: -6, bottom: -6, width: 2, marginLeft: -1, backgroundColor: colors.record },
  times: { flexDirection: 'row', justifyContent: 'space-between' },
  controls: { paddingHorizontal: 28, paddingTop: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  monoBtn: { fontFamily: fonts.mono, fontSize: 13, color: colors.text },
  infoRow: { minHeight: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16, borderTopWidth: 1, borderTopColor: colors.hairline },
});
