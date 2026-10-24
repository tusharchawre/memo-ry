// Stroke icons copied from design/screens/*.html (24×24 viewBox).
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors } from './tokens';

type IconProps = { size?: number; color?: string; strokeWidth?: number };

const stroke = (color: string, strokeWidth: number) => ({
  fill: 'none',
  stroke: color,
  strokeWidth,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

export function BackIcon({ size = 20, color = colors.muted, strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M15 5l-7 7 7 7" {...stroke(color, strokeWidth)} />
    </Svg>
  );
}

export function ChevronIcon({ size = 14, color = colors.muted, strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M9 5l7 7-7 7" {...stroke(color, strokeWidth)} />
    </Svg>
  );
}

export function CloseIcon({ size = 20, color = colors.muted, strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M6 6l12 12M18 6L6 18" {...stroke(color, strokeWidth)} />
    </Svg>
  );
}

export function PlusIcon({ size = 16, color = colors.text, strokeWidth = 2.2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 5v14M5 12h14" {...stroke(color, strokeWidth)} />
    </Svg>
  );
}

export function SearchIcon({ size = 16, color = colors.muted, strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={11} cy={11} r={7} {...stroke(color, strokeWidth)} />
      <Path d="M20 20l-3.5-3.5" {...stroke(color, strokeWidth)} />
    </Svg>
  );
}

export function LaptopIcon({ size = 20, color = colors.text, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={4} y={5} width={16} height={11} rx={1.5} {...stroke(color, strokeWidth)} />
      <Path d="M2 19h20" {...stroke(color, strokeWidth)} />
    </Svg>
  );
}

export function MoreIcon({ size = 18, color = colors.text }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={5} cy={12} r={1.7} fill={color} />
      <Circle cx={12} cy={12} r={1.7} fill={color} />
      <Circle cx={19} cy={12} r={1.7} fill={color} />
    </Svg>
  );
}

export function PenIcon({ size = 14, color = colors.text, strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 20h4L19 9l-4-4L4 16z" {...stroke(color, strokeWidth)} />
    </Svg>
  );
}

export function PlayIcon({ size = 12, color = colors.onLight }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M6 3.5v17l15-8.5z" fill={color} />
    </Svg>
  );
}

export function PauseIcon({ size = 12, color = colors.onLight }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={5} y={4} width={5} height={16} rx={1.5} fill={color} />
      <Rect x={14} y={4} width={5} height={16} rx={1.5} fill={color} />
    </Svg>
  );
}

export function LoopIcon({ size = 18, color = colors.text, strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M17 2l3 3-3 3" {...stroke(color, strokeWidth)} />
      <Path d="M4 11V9a4 4 0 0 1 4-4h12" {...stroke(color, strokeWidth)} />
      <Path d="M7 22l-3-3 3-3" {...stroke(color, strokeWidth)} />
      <Path d="M20 13v2a4 4 0 0 1-4 4H4" {...stroke(color, strokeWidth)} />
    </Svg>
  );
}

export function TrashIcon({ size = 20, color = colors.secondary, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" {...stroke(color, strokeWidth)} />
    </Svg>
  );
}

export function HistoryIcon({ size = 19, color = colors.muted, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3 12a9 9 0 1 0 3-6.7L3 8" {...stroke(color, strokeWidth)} />
      <Path d="M3 3v5h5" {...stroke(color, strokeWidth)} />
      <Path d="M12 7v5l3 2" {...stroke(color, strokeWidth)} />
    </Svg>
  );
}

export function FolderIcon({ size = 36, color = colors.secondary, strokeWidth = 1.5, plus = false }: IconProps & { plus?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2.5h8.5A1.5 1.5 0 0 1 21 9v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z"
        {...stroke(color, strokeWidth)}
      />
      {plus ? <Path d="M12 11v6M9 14h6" {...stroke(color, strokeWidth)} /> : null}
    </Svg>
  );
}

export function InboxIcon({ size = 34, color = colors.secondary, strokeWidth = 1.5 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3 13l3-8h12l3 8v6H3z" {...stroke(color, strokeWidth)} />
      <Path d="M3 13h5l1 2h6l1-2h5" {...stroke(color, strokeWidth)} />
    </Svg>
  );
}

export function DocIcon({ size = 30, color = colors.secondary, strokeWidth = 1.5, lines = true }: IconProps & { lines?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M6 3h8l4 4v14H6z" {...stroke(color, strokeWidth)} />
      <Path d="M14 3v4h4" {...stroke(color, strokeWidth)} />
      {lines ? <Path d="M9 12h6M9 16h4" {...stroke(color, strokeWidth)} /> : null}
    </Svg>
  );
}

export function ImageIcon({ size = 30, color = colors.secondary, strokeWidth = 1.5 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={3} y={4} width={18} height={16} rx={2} {...stroke(color, strokeWidth)} />
      <Circle cx={9} cy={10} r={1.8} {...stroke(color, strokeWidth)} />
      <Path d="M21 16l-5-5-9 9" {...stroke(color, strokeWidth)} />
    </Svg>
  );
}

export function VideoIcon({ size = 30, color = colors.secondary, strokeWidth = 1.5 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={3} y={5} width={14} height={14} rx={2} {...stroke(color, strokeWidth)} />
      <Path d="M17 10l4-2.5v9L17 14" {...stroke(color, strokeWidth)} />
    </Svg>
  );
}

export function AudioIcon({ size = 30, color = colors.secondary, strokeWidth = 1.6 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2" {...stroke(color, strokeWidth)} />
    </Svg>
  );
}
