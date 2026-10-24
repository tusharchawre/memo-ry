import { Text as RNText, type TextProps, type TextStyle } from 'react-native';

import { colors, fonts } from './tokens';

const variants = {
  title: { fontFamily: fonts.semibold, fontSize: 28, letterSpacing: -0.6, color: colors.text },
  sheetTitle: { fontFamily: fonts.semibold, fontSize: 20, letterSpacing: -0.3, color: colors.text },
  body: { fontFamily: fonts.regular, fontSize: 15, color: colors.text },
  bodyMedium: { fontFamily: fonts.medium, fontSize: 15, color: colors.text },
  label: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  tileName: { fontFamily: fonts.medium, fontSize: 13, color: colors.text },
  small: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  mono: { fontFamily: fonts.mono, fontSize: 13, color: colors.muted },
  monoSmall: { fontFamily: fonts.mono, fontSize: 11, color: colors.muted },
  section: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1, color: colors.muted },
  lyric: { fontFamily: fonts.regular, fontSize: 19, lineHeight: 30, color: colors.text },
} satisfies Record<string, TextStyle>;

export type TextVariant = keyof typeof variants;

export function Text({ variant = 'body', style, ...rest }: TextProps & { variant?: TextVariant }) {
  return <RNText {...rest} style={[variants[variant], style]} />;
}

export const textStyles = variants;
