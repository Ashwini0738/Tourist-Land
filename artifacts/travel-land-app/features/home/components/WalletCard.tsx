import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { SecurityIcon } from '@/components/SecurityIcon';
import { elevation, radii, spacing } from '@/constants/theme';

export function WalletCard() {
  const colors = useColors();

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.copy}>
         <Text style={[styles.kicker, { color: colors.primary }]}>A LITTLE INSPIRATION</Text>
         <Text style={[styles.title, { color: colors.foreground }]}>Make room for wonder.</Text>
         <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Find a stay, a story, or a place to begin.</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Open wallet" onPress={() => router.push('/wallet')} style={[styles.wallet, { backgroundColor: colors.primary }]}>
          <SecurityIcon name="wallet" size={25} color={colors.primaryForeground} />
         <Text style={[styles.walletText, { color: colors.primaryForeground }]}>My wallet</Text>
      </Pressable>

      <Pressable accessibilityRole="button" accessibilityLabel="Open travel maps" onPress={() => router.push('/maps')} style={[styles.mapButton, { backgroundColor: colors.accent, borderColor: colors.card }]}>
        <SecurityIcon name="map" size={24} color={colors.accentForeground} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 0, marginHorizontal: spacing.lg, minHeight: 142, borderRadius: radii.lg, overflow: 'visible', borderWidth: 1, flexDirection: 'row', ...elevation.floating },
  copy: { flex: 1, padding: spacing.md, paddingRight: 52, justifyContent: 'center' },
  kicker: { fontSize: 8, fontWeight: '800', letterSpacing: 1.1 },
  title: { fontSize: 20, lineHeight: 24, fontWeight: '700', letterSpacing: -0.4, marginTop: 7 },
  subtitle: { fontSize: 11, lineHeight: 16, marginTop: 7 },
  wallet: { width: 92, borderTopRightRadius: radii.lg, borderBottomRightRadius: radii.lg, justifyContent: 'center', alignItems: 'center', padding: spacing.sm },
  walletText: { fontSize: 11, fontWeight: '800', marginTop: 7 },
  mapButton: { position: 'absolute', top: '50%', right: 70, width: 54, height: 54, borderRadius: 27, transform: [{ translateY: -27 }], alignItems: 'center', justifyContent: 'center', borderWidth: 4, ...elevation.card },
});
