// Pair with Mac: scan the receiver's QR code (localhost:7337/pair on the Mac). docs/spec.md "Pairing".
// `/pair?code=<pairing code>` pairs without the camera (deep links, the simulator).
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { pair } from '@/sync/engine';
import { parsePairing } from '@/sync/format';
import { Button, IconButton } from '@/ui/button';
import { CloseIcon } from '@/ui/icons';
import { Text } from '@/ui/text';
import { colors, layout } from '@/ui/tokens';

export default function PairScreen() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [message, setMessage] = useState('Open localhost:7337/pair on the Mac and point the camera at the code.');
  const busy = useRef(false);
  const lastBad = useRef('');
  const { code } = useLocalSearchParams<{ code?: string }>();

  const onScan = async ({ data }: BarcodeScanningResult) => {
    if (busy.current || data === lastBad.current) return;
    const p = parsePairing(data);
    if (!p) {
      lastBad.current = data;
      setMessage("That isn't a Memo-ry code. Scan the one on the Mac's pairing page.");
      return;
    }
    busy.current = true;
    setMessage(`Connecting to ${p.name}…`);
    try {
      await pair(p);
      router.back();
    } catch {
      setMessage(`Can't reach ${p.name} at ${p.host}. Is the receiver running, and is the phone on the same Wi-Fi?`);
      setTimeout(() => {
        busy.current = false;
      }, 2500);
    }
  };

  useEffect(() => {
    const p = code ? parsePairing(code) : null;
    if (!p) return;
    busy.current = true;
    pair(p).then(
      () => router.back(),
      () => {
        busy.current = false;
        setMessage(`Can't reach ${p.name} at ${p.host}. Is the receiver running, and is the phone on the same Wi-Fi?`);
      },
    );
  }, [code]);

  return (
    <View style={styles.screen}>
      {permission?.granted ? (
        <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={(r) => void onScan(r)} />
      ) : null}

      <View style={[styles.top, { paddingTop: insets.top + 10 }]}>
        <Text variant="sheetTitle">Pair with Mac</Text>
        <IconButton label="Close" onPress={() => router.back()} background={colors.tile}>
          <CloseIcon color={colors.text} />
        </IconButton>
      </View>

      {permission?.granted ? <View style={styles.frame} pointerEvents="none" /> : null}

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 24 }]}>
        <Text variant="body" style={{ color: colors.secondary, lineHeight: 22, textAlign: 'center' }}>
          {permission && !permission.granted ? 'Memo-ry needs the camera once, to scan the pairing code on your Mac.' : message}
        </Text>
        {permission && !permission.granted ? <Button label={permission.canAskAgain ? 'Allow camera' : 'Camera is off in Settings'} disabled={!permission.canAskAgain} onPress={() => void requestPermission()} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, justifyContent: 'space-between' },
  top: { paddingHorizontal: layout.screenX, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  frame: { alignSelf: 'center', width: 240, height: 240, borderRadius: 24, borderWidth: 2, borderColor: colors.text },
  bottom: { paddingHorizontal: layout.screenX, gap: 16, paddingTop: 20, backgroundColor: 'rgba(0,0,0,0.72)' },
});
