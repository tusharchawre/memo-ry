import { View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from './tokens';

type Props = {
  peaks: number[];
  /** Omit to fill the parent (e.g. absolutely positioned in a tile). */
  height?: number;
  barWidth?: number;
  /** Pick each bar's colour; defaults to the plain bar colour. */
  colorAt?: (index: number, count: number) => string;
  minFraction?: number;
  style?: StyleProp<ViewStyle>;
};

/** Bars spread across the width, centred vertically (mockup: justify-content space-between). */
export function Waveform({ peaks, height, barWidth = 2, colorAt, minFraction = 0.12, style }: Props) {
  return (
    <View
      pointerEvents="none"
      style={[{ height: height ?? '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, style]}
    >
      {peaks.map((p, i) => (
        <View
          key={i}
          style={{
            width: barWidth,
            height: `${Math.round(Math.max(minFraction, Math.min(1, p)) * 100)}%`,
            borderRadius: barWidth / 2,
            backgroundColor: colorAt ? colorAt(i, peaks.length) : colors.bar,
          }}
        />
      ))}
    </View>
  );
}

/** Pick `count` evenly spaced values so a 64-peak array fits a small tile. */
export function thin(peaks: number[], count: number): number[] {
  if (peaks.length <= count) return peaks;
  return Array.from({ length: count }, (_, i) => peaks[Math.floor((i * peaks.length) / count)]);
}
