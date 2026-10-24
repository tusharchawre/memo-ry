import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { BackIcon } from './icons';
import { Text } from './text';
import { colors } from './tokens';

/** "‹ Parent" back link on the left, optional actions on the right (02-folder.html header). */
export function TopBar({ backLabel, right, onBack }: { backLabel?: string; right?: ReactNode; onBack?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: -8 }}>
      <Pressable
        onPress={onBack ?? (() => router.back())}
        accessibilityRole="button"
        accessibilityLabel={`Back to ${backLabel ?? 'previous screen'}`}
        style={({ pressed }) => [{ minHeight: 44, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 2, flexShrink: 1 }, pressed && { opacity: 0.6 }]}
      >
        <BackIcon />
        {backLabel ? (
          <Text variant="body" numberOfLines={1} style={{ color: colors.muted, flexShrink: 1 }}>
            {backLabel}
          </Text>
        ) : null}
      </Pressable>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>{right}</View>
    </View>
  );
}
