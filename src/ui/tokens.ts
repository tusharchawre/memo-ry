// Design tokens, taken from design/screens/*.html. Match these exactly.

export const colors = {
  background: '#000000',
  tile: '#161616',
  sheet: '#111111',
  input: '#1C1C1E',
  hairline: '#1F1F1F',
  track: '#2C2C2E',
  handle: '#3A3A3C',
  text: '#F5F5F5',
  secondary: '#C7C7CC',
  muted: '#8E8E93',
  faint: '#6E6E73',
  bar: '#D1D1D6',
  barDim: '#3A3A3C',
  record: '#FF5A52',
  synced: '#2F9E5B',
  warning: '#F5A524',
  onLight: '#000000',
} as const;

export const statusColors = {
  idea: '#8E8E93',
  writing: '#A78BFA',
  producing: '#F5A524',
  done: '#2F9E5B',
} as const;

// Each weight is its own family; RN can't synthesize weights for custom fonts.
export const fonts = {
  light: 'Geist_300Light',
  regular: 'Geist_400Regular',
  medium: 'Geist_500Medium',
  semibold: 'Geist_600SemiBold',
  mono: 'GeistMono_400Regular',
  monoMedium: 'GeistMono_500Medium',
} as const;

export const layout = {
  screenX: 20,
  minTouch: 44,
  gridGap: 14,
  gridRowGap: 18,
  tileRadius: 14,
  folderRadius: 16,
} as const;
