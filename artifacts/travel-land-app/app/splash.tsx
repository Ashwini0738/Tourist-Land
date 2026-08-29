import { PlatformIcon as Feather } from '@/components/PlatformIcon';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

export default function SplashScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  useEffect(() => {
    const timer = setTimeout(() => router.replace('/login'), 850);
    return () => clearTimeout(timer);
  }, []);
  return <View style={[styles.container, { backgroundColor: colors.primary, paddingTop: insets.top, paddingBottom: insets.bottom }]}><View style={styles.mark}><Feather name="map-pin" size={34} color={colors.primary} /></View><Text style={styles.title}>Travel<Text style={{ color: colors.accent }}> & </Text>Land</Text><Text style={styles.subtitle}>Go somewhere that feels like you.</Text><Pressable onPress={() => router.replace('/login')} style={styles.skip}><Text style={styles.skipText}>Skip intro</Text></Pressable></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mark: { width: 74, height: 74, borderRadius: 37, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-10deg' }] },
  title: { color: '#fff', fontSize: 34, fontWeight: '700', letterSpacing: -1, marginTop: 22 },
  subtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 8 },
  skip: { position: 'absolute', bottom: 28 },
  skipText: { color: 'rgba(255,255,255,0.72)', fontSize: 12, fontWeight: '600' },
});