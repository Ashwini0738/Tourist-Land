import { PlatformIcon as Feather } from '@/components/PlatformIcon';
import { router } from 'expo-router';
import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { stays } from '@/lib/content';
import { useColors } from '@/hooks/useColors';
import { getFavoriteKey, useAppState } from '@/context/AppStateContext';

export default function HotelsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isFavorite, toggleFavorite } = useAppState();
  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}><Pressable onPress={() => router.back()}><Feather name="arrow-left" size={21} color={colors.foreground} /></Pressable><Text style={[styles.kicker, { color: colors.primary }]}>STAYS</Text><Text style={[styles.title, { color: colors.foreground }]}>Sleep somewhere{'\n'}worth waking up in.</Text>{stays.map((stay) => { const favoriteId = getFavoriteKey('hotel', stay.id); return <Pressable key={stay.id} onPress={() => router.push(`/hotel/${stay.id}`)} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}><Image source={stay.image} style={styles.image} /><Pressable accessibilityRole="button" accessibilityLabel={`${isFavorite(favoriteId) ? 'Remove' : 'Add'} ${stay.name} ${isFavorite(favoriteId) ? 'from' : 'to'} favorites`} onPress={(event) => { event.stopPropagation(); toggleFavorite(favoriteId); }} style={styles.favorite}><Feather name="heart" size={16} color={isFavorite(favoriteId) ? colors.destructive : '#fff'} fill={isFavorite(favoriteId) ? colors.destructive : 'transparent'} /></Pressable><Text style={[styles.name, { color: colors.foreground }]}>{stay.name}</Text><Text style={[styles.location, { color: colors.mutedForeground }]}>{stay.location} · <Feather name="star" size={12} color={colors.accentForeground} /> {stay.rating}</Text><Text style={[styles.price, { color: colors.primary }]}>{stay.price}<Text style={{ fontWeight: '400', color: colors.mutedForeground }}> / night</Text></Text></Pressable>; })}</ScrollView>;
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginTop: 33, marginBottom: 8 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.8, marginBottom: 24 },
  card: { borderWidth: 1, borderRadius: 20, padding: 10, marginBottom: 14 },
  image: { width: '100%', height: 180, borderRadius: 14 },
  favorite: { position: 'absolute', top: 20, right: 20, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.38)' },
  name: { fontSize: 18, fontWeight: '700', marginTop: 13 },
  location: { fontSize: 12, marginTop: 5 },
  price: { fontSize: 15, fontWeight: '700', marginTop: 12 },
});