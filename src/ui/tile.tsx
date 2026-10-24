// File and folder tiles with content thumbnails (design/screens/01-library.html, 02-folder.html).
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import type { Item } from '@/library/library';
import { formatDuration, seededPeaks } from '@/library/names';
import { parseLyrics } from '@/lyrics/lyrics';

import { AudioIcon, DocIcon, FolderIcon, InboxIcon, VideoIcon } from './icons';
import { Text } from './text';
import { colors, fonts, layout } from './tokens';
import { thin, Waveform } from './waveform';

type Props = {
  item: Item;
  onPress: () => void;
  onLongPress?: () => void;
  /** Second line under the name (Library shows the folder; Recent shows where it lives). */
  subtitle?: string;
};

export function Tile({ item, onPress, onLongPress, subtitle }: Props) {
  const isFolder = item.kind === 'folder';
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={isFolder ? `${item.title} folder` : `${item.title}${item.ext ? ` ${item.ext}` : ''}`}
      style={({ pressed }) => [styles.wrap, pressed && { opacity: 0.6 }]}
    >
      <View style={[styles.square, { borderRadius: isFolder ? layout.folderRadius : layout.tileRadius }]}>
        <Thumbnail item={item} />
        {!isFolder && item.ext ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.ext}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.caption}>
        <Text variant="tileName" numberOfLines={1}>
          {item.title}
        </Text>
        {isFolder ? (
          <Text variant="monoSmall" numberOfLines={1}>
            {item.count === 1 ? '1 item' : `${item.count ?? 0} items`}
          </Text>
        ) : subtitle ? (
          <Text variant="small" style={{ fontSize: 11 }} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function Thumbnail({ item }: { item: Item }) {
  switch (item.kind) {
    case 'folder':
      return <View style={styles.center}>{item.isInbox ? <InboxIcon /> : <FolderIcon />}</View>;
    case 'image':
      return <Image source={{ uri: item.uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={120} />;
    case 'audio': {
      const peaks = item.recording?.peaks?.length ? item.recording.peaks : seededPeaks(item.name);
      return (
        <>
          <View style={styles.wave}>
            <Waveform peaks={thin(peaks, 16)} />
          </View>
          {item.recording?.durationSec ? (
            <Text style={styles.duration}>{formatDuration(item.recording.durationSec)}</Text>
          ) : (
            <View style={styles.cornerIcon}>
              <AudioIcon size={14} color={colors.muted} />
            </View>
          )}
        </>
      );
    }
    case 'lyrics':
    case 'text':
      return <TextPreview item={item} />;
    case 'midi':
      return <MidiGlyph />;
    case 'pdf':
      return (
        <View style={styles.page}>
          <Text style={styles.pageTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.pageLine} />
          <View style={[styles.pageLine, { width: '70%' }]} />
          <View style={[styles.pageLine, { width: '85%' }]} />
        </View>
      );
    case 'video':
      return (
        <View style={styles.center}>
          <VideoIcon />
        </View>
      );
    default:
      return (
        <View style={styles.center}>
          <DocIcon lines={false} />
        </View>
      );
  }
}

function TextPreview({ item }: { item: Item }) {
  const text = item.preview ?? '';
  if (item.kind === 'lyrics') {
    const sections = parseLyrics(text, item.title).sections.slice(0, 3);
    return (
      <View style={styles.textPreview}>
        {sections.map((s, i) => (
          <View key={i}>
            <Text style={styles.previewLabel}>{s.heading.toUpperCase()}</Text>
            <Text style={styles.previewText} numberOfLines={2}>
              {s.body || '…'}
            </Text>
          </View>
        ))}
      </View>
    );
  }
  return (
    <View style={styles.textPreview}>
      <Text style={styles.previewText} numberOfLines={6}>
        {text || '…'}
      </Text>
    </View>
  );
}

function MidiGlyph() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100">
      <Path d="M8 22H92M8 34H92M8 46H92M8 58H92M8 70H92M8 82H92" stroke="#242426" strokeWidth={1} />
      <Rect x={10} y={59} width={16} height={10} rx={2} fill={colors.bar} />
      <Rect x={28} y={47} width={10} height={10} rx={2} fill={colors.bar} />
      <Rect x={40} y={35} width={22} height={10} rx={2} fill={colors.bar} />
      <Rect x={64} y={47} width={10} height={10} rx={2} fill={colors.bar} />
      <Rect x={76} y={23} width={14} height={10} rx={2} fill={colors.bar} />
      <Rect x={40} y={71} width={34} height={10} rx={2} fill="#5A5A5E" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: 8 },
  square: { aspectRatio: 1, backgroundColor: colors.tile, overflow: 'hidden' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', bottom: 7, right: 7, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5, backgroundColor: colors.background },
  badgeText: { fontFamily: fonts.mono, fontSize: 10, color: colors.secondary },
  caption: { gap: 2, paddingHorizontal: 2 },
  wave: { position: 'absolute', left: 12, right: 12, top: '22%', bottom: '32%' },
  duration: { position: 'absolute', left: 9, bottom: 8, fontFamily: fonts.mono, fontSize: 10, color: colors.muted },
  cornerIcon: { position: 'absolute', left: 9, bottom: 8 },
  textPreview: { position: 'absolute', top: 10, left: 10, right: 10, bottom: 10, overflow: 'hidden', gap: 4 },
  previewLabel: { fontFamily: fonts.mono, fontSize: 6, letterSpacing: 0.5, color: colors.muted },
  previewText: { fontFamily: fonts.regular, fontSize: 7.5, lineHeight: 11, color: colors.secondary },
  page: { position: 'absolute', top: 12, left: 16, right: 16, bottom: 0, borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: '#E8E8E5', padding: 7, gap: 5 },
  pageTitle: { fontFamily: fonts.monoMedium, fontSize: 6.5, color: '#2C2C2E' },
  pageLine: { height: 2, borderRadius: 1, backgroundColor: '#BDBDB8', width: '100%' },
});
