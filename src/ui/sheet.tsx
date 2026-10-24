// Bottom sheets (design/screens/05-save-recording.html, 07-add-to-folder.html).
import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from './button';
import { Text } from './text';
import { colors, fonts } from './tokens';

type SheetProps = { visible: boolean; onClose: () => void; children: ReactNode };

export function Sheet({ visible, onClose, children }: SheetProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 14 }]}>
          <View style={styles.handle} />
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

type PromptProps = {
  visible: boolean;
  title: string;
  initial?: string;
  placeholder?: string;
  confirmLabel: string;
  onSubmit: (value: string) => void;
  onClose: () => void;
};

/** A one-field sheet (new folder, rename). Remount with a new `key` to reset the value. */
export function PromptSheet({ visible, title, initial = '', placeholder, confirmLabel, onSubmit, onClose }: PromptProps) {
  const [value, setValue] = useState(initial);
  const submit = () => {
    if (value.trim()) onSubmit(value.trim());
  };
  return (
    <Sheet visible={visible} onClose={onClose}>
      <Text variant="sheetTitle">{title}</Text>
      <TextInput
        value={value}
        onChangeText={setValue}
        placeholder={placeholder}
        placeholderTextColor={colors.faint}
        autoFocus
        selectTextOnFocus
        returnKeyType="done"
        onSubmitEditing={submit}
        style={styles.input}
      />
      <View style={{ gap: 4 }}>
        <Button label={confirmLabel} onPress={submit} disabled={!value.trim()} />
        <Button label="Cancel" variant="ghost" onPress={onClose} />
      </View>
    </Sheet>
  );
}

export type SheetAction = { label: string; onPress: () => void; destructive?: boolean };

/** A list of actions (long-press menu on a tile). */
export function ActionSheet({ visible, title, actions, onClose }: { visible: boolean; title: string; actions: SheetAction[]; onClose: () => void }) {
  return (
    <Sheet visible={visible} onClose={onClose}>
      <Text variant="sheetTitle" numberOfLines={1}>
        {title}
      </Text>
      <View style={{ gap: 8 }}>
        {actions.map((a) => (
          <Pressable
            key={a.label}
            onPress={a.onPress}
            accessibilityRole="button"
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
          >
            <Text variant="body" style={a.destructive ? { color: colors.record } : undefined}>
              {a.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <Button label="Cancel" variant="ghost" onPress={onClose} />
    </Sheet>
  );
}

export const sheetStyles = StyleSheet.create({
  input: {
    minHeight: 46,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.input,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 16,
  },
});

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: colors.sheet,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    paddingHorizontal: 20,
    gap: 18,
  },
  handle: { alignSelf: 'center', width: 36, height: 5, borderRadius: 999, backgroundColor: colors.handle },
  input: sheetStyles.input,
  row: { minHeight: 50, paddingHorizontal: 16, borderRadius: 14, backgroundColor: colors.input, justifyContent: 'center' },
});
