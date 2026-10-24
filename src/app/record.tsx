// Recording + save sheet (design/screens/04-recording.html, 05-save-recording.html).
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  type RecorderState,
} from 'expo-audio';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { discardTemp, folderTitle, readLyrics, saveRecording } from '@/library/library';
import { dateStamp, downsample, formatDuration, levelFromDb } from '@/library/names';
import { sectionId } from '@/lyrics/lyrics';
import { Button, IconButton } from '@/ui/button';
import { CloseIcon, PauseIcon, PlayIcon, TrashIcon } from '@/ui/icons';
import { Sheet, sheetStyles } from '@/ui/sheet';
import { Text } from '@/ui/text';
import { colors, fonts } from '@/ui/tokens';
import { thin, Waveform } from '@/ui/waveform';

const LIVE_BARS = 39;
const IDLE_BARS = 19;

type Phase = 'starting' | 'recording' | 'paused' | 'review';

export default function RecordScreen() {
  const { folder = '' } = useLocalSearchParams<{ folder: string }>();
  const insets = useSafeAreaInsets();
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const [state, setRecorderState] = useState<Pick<RecorderState, 'durationMillis'>>({ durationMillis: 0 });
  const [phase, setPhase] = useState<Phase>('starting');
  const [live, setLive] = useState<number[]>([]);
  const levels = useRef<number[]>([]);
  const [tempUri, setTempUri] = useState<string | null>(null);
  const [durationSec, setDurationSec] = useState(0);
  const [peaks, setPeaks] = useState<number[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Microphone is off', 'Allow microphone access in Settings to record ideas.');
        router.back();
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      if (cancelled) return;
      recorder.record();
      setPhase('recording');
    })();
    return () => {
      cancelled = true;
      setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    };
  }, [recorder]);

  // Poll every 80 ms while recording: one level per tick; the full series becomes the saved peaks.
  useEffect(() => {
    if (phase !== 'recording') return;
    const id = setInterval(() => {
      const s = recorder.getStatus();
      setRecorderState({ durationMillis: s.durationMillis });
      if (!s.isRecording) return;
      const level = levelFromDb(s.metering);
      levels.current.push(level);
      setLive((l) => [...l.slice(-(LIVE_BARS - 1)), level]);
    }, 80);
    return () => clearInterval(id);
  }, [phase, recorder]);

  const stop = async () => {
    const seconds = recorder.getStatus().durationMillis / 1000;
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    setDurationSec(seconds);
    setPeaks(downsample(levels.current, 64));
    setTempUri(recorder.uri);
    setPhase('review');
  };

  const togglePause = () => {
    if (phase === 'recording') {
      recorder.pause();
      setPhase('paused');
    } else if (phase === 'paused') {
      recorder.record();
      setPhase('recording');
    }
  };

  const discard = async () => {
    if (phase === 'recording' || phase === 'paused') await recorder.stop();
    const uri = tempUri ?? recorder.uri;
    if (uri) discardTemp(uri);
    router.back();
  };

  const bars = [...Array(Math.max(0, LIVE_BARS - live.length)).fill(0), ...live];

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 10 }]}>
      <View style={styles.top}>
        <IconButton label="Cancel recording" onPress={discard}>
          <CloseIcon />
        </IconButton>
        <Text variant="label" numberOfLines={1} style={{ flex: 1, textAlign: 'center' }}>
          Recording into <Text variant="label" style={{ color: colors.text }}>{folderTitle(folder)}</Text>
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.middle}>
        <View style={{ alignItems: 'center', gap: 10 }}>
          <View style={styles.recRow}>
            <View style={[styles.recDot, phase !== 'recording' && { opacity: 0.3 }]} />
            <Text style={styles.recText}>{phase === 'paused' ? 'PAUSED' : 'REC'}</Text>
          </View>
          <Text style={styles.timer}>{formatDuration(state.durationMillis / 1000)}</Text>
        </View>

        <View style={styles.liveWrap} accessibilityLabel="Live waveform" accessible>
          {bars.map((l, i) => (
            <View key={`l${i}`} style={[styles.liveBar, { height: Math.max(4, l * 140) }]} />
          ))}
          <View style={styles.playhead} />
          {Array.from({ length: IDLE_BARS }, (_, i) => (
            <View key={`i${i}`} style={[styles.liveBar, { height: 3, backgroundColor: colors.track }]} />
          ))}
        </View>
      </View>

      <View style={[styles.controls, { paddingBottom: insets.bottom + 34 }]}>
        <IconButton label="Discard" size={56} background={colors.tile} onPress={discard}>
          <TrashIcon />
        </IconButton>
        <Pressable onPress={stop} disabled={phase === 'starting' || phase === 'review'} accessibilityRole="button" accessibilityLabel="Stop and save" style={styles.stopRing}>
          <View style={styles.stopSquare} />
        </Pressable>
        <IconButton label={phase === 'paused' ? 'Resume' : 'Pause'} size={56} background={colors.tile} onPress={togglePause}>
          {phase === 'paused' ? <PlayIcon size={16} color={colors.text} /> : <PauseIcon size={16} color={colors.text} />}
        </IconButton>
      </View>

      {phase === 'review' && tempUri ? (
        <SaveSheet folder={folder} tempUri={tempUri} durationSec={durationSec} peaks={peaks} onDiscard={discard} />
      ) : null}
    </View>
  );
}

function SaveSheet({ folder, tempUri, durationSec, peaks, onDiscard }: { folder: string; tempUri: string; durationSec: number; peaks: number[]; onDiscard: () => void }) {
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [linked, setLinked] = useState<string | null>(null);
  const sections = useMemo(() => readLyrics(folder).sections, [folder]);
  const player = useAudioPlayer({ uri: tempUri });
  const status = useAudioPlayerStatus(player);

  const togglePlay = () => {
    if (status.playing) {
      player.pause();
    } else {
      if (status.didJustFinish || (status.duration > 0 && status.currentTime >= status.duration - 0.05)) player.seekTo(0);
      player.play();
    }
  };

  const save = () => {
    player.pause();
    saveRecording(folder, tempUri, { title: name.trim() || 'untitled', note: note.trim(), linkedSection: linked, durationSec: Math.round(durationSec), peaks });
    router.back();
  };

  const progress = status.duration > 0 ? status.currentTime / status.duration : 0;

  return (
    <Sheet visible onClose={() => {}}>
      <ScrollView contentContainerStyle={{ gap: 20 }} keyboardShouldPersistTaps="handled" style={{ maxHeight: 640 }}>
        <Text variant="sheetTitle">Save recording</Text>

        <View style={styles.preview}>
          <IconButton label={status.playing ? 'Pause' : 'Play recording'} size={36} background={colors.text} onPress={togglePlay}>
            {status.playing ? <PauseIcon /> : <PlayIcon />}
          </IconButton>
          <Waveform peaks={thin(peaks, 40)} height={28} style={{ flex: 1 }} colorAt={(i, n) => (i / n < progress ? colors.text : colors.secondary)} />
          <Text variant="mono" style={{ fontSize: 12 }}>
            {formatDuration(durationSec)}
          </Text>
        </View>

        <View style={{ gap: 8 }}>
          <Text variant="label">Name</Text>
          <TextInput value={name} onChangeText={setName} placeholder="hook melody" placeholderTextColor={colors.faint} style={sheetStyles.input} accessibilityLabel="Name" />
        </View>
        <View style={{ gap: 8 }}>
          <Text variant="label">Note</Text>
          <TextInput value={note} onChangeText={setNote} placeholder="slow, minor" placeholderTextColor={colors.faint} style={sheetStyles.input} accessibilityLabel="Note" />
        </View>

        <View style={{ gap: 8 }}>
          <Text variant="label">Goes with</Text>
          <View style={styles.pills}>
            {[{ id: null, label: 'None' }, ...sections.map((s) => ({ id: sectionId(s.heading), label: s.heading }))].map((opt) => {
              const selected = linked === opt.id;
              return (
                <Pressable
                  key={opt.id ?? 'none'}
                  onPress={() => setLinked(opt.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={[styles.pill, selected && { backgroundColor: colors.text }]}
                >
                  <Text style={[styles.pillText, selected && { color: colors.onLight, fontFamily: fonts.medium }]}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Text variant="monoSmall" style={{ lineHeight: 16 }}>
          {folderTitle(folder)}/recordings/{'\n'}
          {dateStamp(new Date())} {name.trim() || 'untitled'}.m4a
        </Text>

        <View style={{ gap: 4 }}>
          <Button label="Save" onPress={save} />
          <Button label="Discard" variant="ghost" onPress={onDiscard} />
        </View>
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  top: { paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center' },
  middle: { flex: 1, justifyContent: 'center', gap: 48 },
  recRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recDot: { width: 8, height: 8, borderRadius: 999, backgroundColor: colors.record },
  recText: { fontFamily: fonts.mono, fontSize: 12, letterSpacing: 1, color: colors.record },
  timer: { fontFamily: fonts.light, fontSize: 72, letterSpacing: -2, color: colors.text, fontVariant: ['tabular-nums'] },
  liveWrap: { height: 140, paddingLeft: 20, flexDirection: 'row', alignItems: 'center', gap: 3, overflow: 'hidden' },
  liveBar: { width: 3, borderRadius: 2, backgroundColor: colors.text },
  playhead: { width: 2, height: 140, backgroundColor: colors.record },
  controls: { paddingHorizontal: 40, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stopRing: { width: 80, height: 80, borderRadius: 999, borderWidth: 3, borderColor: colors.text, alignItems: 'center', justifyContent: 'center' },
  stopSquare: { width: 30, height: 30, borderRadius: 8, backgroundColor: colors.record },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, backgroundColor: colors.input },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { minHeight: 36, paddingHorizontal: 13, borderRadius: 999, backgroundColor: colors.input, justifyContent: 'center' },
  pillText: { fontFamily: fonts.regular, fontSize: 14, color: colors.secondary },
});
