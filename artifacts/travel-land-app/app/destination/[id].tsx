import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { destinations } from '@/lib/content';
import { useColors } from '@/hooks/useColors';
import { useAppState } from '@/context/AppStateContext';

export default function DestinationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const destination = destinations.find((item) => item.id === id) ?? destinations[0];
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { toggleFavorite, isFavorite } = useAppState();
  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}><View style={styles.hero}><Image source={destination.image} style={styles.heroImage} /><View style={styles.heroShade} /><View style={[styles.back, { top: insets.top + 10 }]}><Pressable onPress={() => router.back()}><Feather name="arrow-left" size={21} color={colors.foreground} /></Pressable><Pressable onPress={() => toggleFavorite(destination.id)}><Feather name="heart" size={20} color={isFavorite(destination.id) ? colors.destructive : colors.foreground} fill={isFavorite(destination.id) ? colors.destructive : 'transparent'} /></Pressable></View><View style={styles.heroCopy}><Text style={styles.country}>{destination.country.toUpperCase()} / 2026</Text><Text style={styles.heroTitle}>{destination.name}</Text></View></View><View style={styles.body}><Text style={[styles.tagline, { color: colors.primary }]}>{destination.tagline}</Text><Text style={[styles.description, { color: colors.foreground }]}>{destination.description}</Text><View style={[styles.infoRow, { borderColor: colors.border }]}><View><Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>BEST TIME</Text><Text style={[styles.infoValue, { color: colors.foreground }]}>Oct — Mar</Text></View><View><Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>FEELS LIKE</Text><Text style={[styles.infoValue, { color: colors.foreground }]}>Unhurried</Text></View><View><Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>TODAY</Text><Text style={[styles.infoValue, { color: colors.foreground }]}>{destination.stat}</Text></View></View><Pressable onPress={() => router.push('/booking')} style={[styles.cta, { backgroundColor: colors.primary }]}><Text style={[styles.ctaText, { color: colors.primaryForeground }]}>Find a stay here</Text><Feather name="arrow-right" size={17} color={colors.primaryForeground} /></Pressable></View></ScrollView>;
}

const styles = StyleSheet.create({
  container: { paddingBottom: 40 },
  hero: { height: 460, position: 'relative' },
  heroImage: { ...StyleSheet.absoluteFillObject, width: undefined, height: undefined },
  heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(17, 35, 27, 0.32)' },
  back: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  back: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroCopy: { position: 'absolute', bottom: 30, left: 20, right: 20 },
  country: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  heroTitle: { color: '#fff', fontSize: 37, lineHeight: 42, fontWeight: '700', letterSpacing: -1 },
  body: { padding: 22 },
  tagline: { fontSize: 16, fontWeight: '700' },
  description: { fontSize: 18, lineHeight: 27, marginTop: 10, letterSpacing: -0.2 },
  infoRow: { borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 17, marginTop: 28, flexDirection: 'row', justifyContent: 'space-between' },
  infoLabel: { fontSize: 10, letterSpacing: 1.2, fontWeight: '700' },
  infoValue: { fontSize: 13, fontWeight: '700', marginTop: 7 },
  cta: { marginTop: 26, padding: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  ctaText: { fontSize: 14, fontWeight: '700' },
});