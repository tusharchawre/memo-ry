import { GeistMono_400Regular } from '@expo-google-fonts/geist-mono/400Regular';
import { GeistMono_500Medium } from '@expo-google-fonts/geist-mono/500Medium';
import { Geist_300Light } from '@expo-google-fonts/geist/300Light';
import { Geist_400Regular } from '@expo-google-fonts/geist/400Regular';
import { Geist_500Medium } from '@expo-google-fonts/geist/500Medium';
import { Geist_600SemiBold } from '@expo-google-fonts/geist/600SemiBold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ensureLibrary } from '@/library/library';
import { seedSampleLibrary } from '@/library/seed';
import { startAutoSync } from '@/sync/engine';
import { colors } from '@/ui/tokens';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Geist_300Light,
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    GeistMono_400Regular,
    GeistMono_500Medium,
  });
  // Synchronous file I/O, once, before the first screen reads the library.
  const [libraryReady] = useState(() => {
    ensureLibrary();
    if (__DEV__) seedSampleLibrary();
    return true;
  });

  const ready = fontsLoaded && libraryReady;
  useEffect(() => {
    if (!ready) return;
    SplashScreen.hideAsync();
    startAutoSync();
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: 'slide_from_right' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="folder" />
        <Stack.Screen name="lyrics" />
        <Stack.Screen name="player" />
        <Stack.Screen name="search" options={{ animation: 'fade' }} />
        <Stack.Screen name="sync" />
        <Stack.Screen name="pair" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="record" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom', gestureEnabled: false }} />
      </Stack>
    </SafeAreaProvider>
  );
}
