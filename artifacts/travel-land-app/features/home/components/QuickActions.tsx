import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { PlatformIcon as Feather } from '@/components/PlatformIcon';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { elevation, radii, spacing } from '@/constants/theme';

const quickActions = [
  { label: 'Explore', icon: 'compass', route: '/(tabs)/explore' },
  { label: 'Destinations', icon: 'map-pin', route: { pathname: '/(tabs)/explore', params: { filter: 'Destinations' } } },
  { label: 'Hotels', icon: 'home', route: '/hotels' },
  { label: 'Maps', icon: 'map', route: '/maps' },
  { label: 'Bookings', icon: 'calendar', route: '/(tabs)/bookings' },
  { label: 'Land', icon: 'layers', route: '/(tabs)/land' },
] as const;

export function QuickActions() {
  const colors = useColors();

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}><View><Text style={[styles.kicker, { color: colors.primary }]}>MAKE IT YOURS</Text><Text style={[styles.title, { color: colors.foreground }]}>Choose your way in.</Text></View></View>
      <View style={styles.grid}>
        {quickActions.map((action) => (
          <Pressable 
            key={action.label} 
            accessibilityRole="button"
            accessibilityLabel={`Open ${action.label}`}
            onPress={() => router.push(action.route as any)}
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}
          >
            <View style={[styles.icon, { backgroundColor: colors.secondary, borderColor: colors.border }, action.label === 'Bookings' && { backgroundColor: colors.accent }]}>
               <Feather name={action.icon as any} size={21} color={action.label === 'Bookings' ? colors.accentForeground : colors.primary} />
            </View>
            <Text style={[styles.label, { color: colors.foreground }]}>{action.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: spacing.xl, paddingHorizontal: spacing.lg },
  sectionHeader: { marginBottom: spacing.md },
  kicker: { fontSize: 9, fontWeight: '800', letterSpacing: 1.3, marginBottom: 5 },
  title: { fontSize: 20, lineHeight: 25, fontWeight: '700', letterSpacing: -0.3 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 2 },
  action: { width: '31%', alignItems: 'center', marginBottom: spacing.lg, minHeight: 84 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.97 }] },
  icon: { width: 58, height: 58, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center', ...elevation.card },
  label: { fontSize: 11, marginTop: 9, fontWeight: '700' },
});
