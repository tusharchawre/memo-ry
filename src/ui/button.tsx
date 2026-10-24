import type { ReactNode } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { Text } from './text';
import { colors, fonts } from './tokens';

type Variant = 'primary' | 'secondary' | 'ghost';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: ReactNode;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Pill buttons from the mockups: primary = white on black, secondary = #161616, ghost = muted text. */
export function Button({ label, onPress, variant = 'primary', icon, disabled, style }: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        (pressed || disabled) && { opacity: disabled ? 0.4 : 0.7 },
        style,
      ]}
    >
      {icon}
      <Text
        style={[
          styles.label,
          variant === 'primary' && { color: colors.onLight, fontFamily: fonts.semibold, fontSize: 16 },
          variant === 'ghost' && { color: colors.muted },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

type IconButtonProps = {
  onPress: () => void;
  label: string;
  children: ReactNode;
  size?: number;
  background?: string;
  style?: StyleProp<ViewStyle>;
};

export function IconButton({ onPress, label, children, size = 44, background = 'transparent', style }: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={size < 44 ? (44 - size) / 2 : 0}
      style={({ pressed }) => [
        { width: size, height: size, borderRadius: 999, backgroundColor: background, alignItems: 'center', justifyContent: 'center' },
        pressed && { opacity: 0.6 },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 44, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 16 },
  primary: { minHeight: 50, backgroundColor: colors.text },
  secondary: { backgroundColor: colors.tile },
  label: { fontFamily: fonts.regular, fontSize: 15, color: colors.text },
});
