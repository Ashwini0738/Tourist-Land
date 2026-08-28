import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { destinations, properties, stays } from '@/lib/content';
import { useAppState } from '@/context/AppStateContext';
import { useColors } from '@/hooks/useColors';

export default function SavedScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { favoriteIds, toggleFavorite } = useAppState();
  const items = [...destinations, ...properties, ...stays].filter((item) => favoriteIds.includes(item.id));
  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: Platform.OS === 'web' ? 102 : 118 }]}><Text style={[styles.kicker, { color: colors.primary }]}>YOUR COLLECTION</Text><Text style={[styles.title, { color: colors.foreground }]}>Saved for later.</Text><Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{items.length ? `${items.length} places worth coming back to` : 'Keep the good places close.'}</Text>{items.length ? items.map((item) => <Pressable key={item.id} onPress={() => router.push(`/destination/${item.id}`)} style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]}><Image source={item.image} style={styles.image} /><View style={styles.copy}><Text style={[styles.name, { color: colors.foreground }]}>{item.name ?? item.title}</Text><Text style={[styles.place, { color: colors.mutedForeground }]}>{'region' in item ? item.region : 'location' in item ? item.location : item.location}</Text></View><Pressable onPress={() => toggleFavorite(item.id)} hitSlop={12}><Feather name="heart" size={19} color={colors.destructive} fill={colors.destructive} /></Pressable></Pressable>) : <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}><Feather name="heart" size={25} color={colors.primary} /></View><Text style={[styles.emptyTitle, { color: colors.foreground }]}>Your collection is waiting</Text><Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Tap the heart on a destination, stay, or parcel to save it here.</Text><Pressable onPress={() => router.push('/(tabs)/explore')} style={[styles.button, { backgroundColor: colors.primary }]}><Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Start exploring</Text></Pressable></View>}</ScrollView>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20 },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.8 },
  subtitle: { fontSize: 13, marginTop: 8, marginBottom: 24 },
  item: { borderWidth: 1, borderRadius: 18, padding: 10, flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  image: { width: 72, height: 72, borderRadius: 12 },
  copy: { flex: 1, marginLeft: 12 },
  name: { fontSize: 16, fontWeight: '700' },
  place: { fontSize: 12, marginTop: 6 },
  empty: { borderWidth: 1, borderRadius: 22, alignItems: 'center', padding: 28, marginTop: 22 },
  emptyIcon: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 16 },
  emptyText: { fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 8 },
  button: { borderRadius: 100, paddingHorizontal: 18, paddingVertical: 12, marginTop: 20 },
  buttonText: { fontSize: 13, fontWeight: '700' },
});