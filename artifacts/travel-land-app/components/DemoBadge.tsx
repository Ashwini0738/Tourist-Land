import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';

export const demoModeEnabled = process.env.EXPO_PUBLIC_DEMO_MODE === 'true';

export function DemoBadge({ label = 'Demo Data' }: { label?: string }) {
  const colors = useColors();
  if (!demoModeEnabled) return null;
  return (
    <View accessibilityLabel={label} style={[styles.badge, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
      <View style={[styles.dot, { backgroundColor: colors.primary }]} />
      <Text style={[styles.text, { color: colors.secondaryForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 100, paddingHorizontal: 9, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 10, fontWeight: '800', letterSpacing: 0.2 },
});