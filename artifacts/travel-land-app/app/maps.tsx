import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

const markers = [{ x: '27%', y: '30%', type: 'destination' }, { x: '63%', y: '23%', type: 'hotel' }, { x: '50%', y: '64%', type: 'property' }, { x: '78%', y: '57%', type: 'attraction' }] as const;

export default function MapsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}><View style={styles.header}><Pressable onPress={() => router.back()}><Feather name="arrow-left" size={21} color={colors.foreground} /></Pressable><Text style={[styles.headerTitle, { color: colors.foreground }]}>Places around you</Text><Pressable><Feather name="layers" size={20} color={colors.foreground} /></Pressable></View><View style={[styles.map, { backgroundColor: colors.secondary }]}>{Array.from({ length: 7 }).map((_, i) => <View key={`h-${i}`} style={[styles.gridHorizontal, { top: `${12 + i * 14}%`, borderColor: colors.card }]} />)}{Array.from({ length: 5 }).map((_, i) => <View key={`v-${i}`} style={[styles.gridVertical, { left: `${12 + i * 20}%`, borderColor: colors.card }]} />)}<View style={[styles.road, { backgroundColor: colors.card, transform: [{ rotate: '23deg' }] }]} /><View style={[styles.road, { backgroundColor: colors.card, transform: [{ rotate: '-28deg' }], top: '52%' }]} />{markers.map((marker) => <Pressable key={marker.type} style={[styles.marker, { left: marker.x, top: marker.y, backgroundColor: marker.type === 'property' ? colors.accent : colors.primary }]}><Feather name={marker.type === 'hotel' ? 'home' : marker.type === 'attraction' ? 'star' : marker.type === 'property' ? 'map-pin' : 'compass'} size={15} color={marker.type === 'property' ? colors.accentForeground : colors.primaryForeground} /></Pressable>)}<View style={[styles.location, { borderColor: colors.primary, backgroundColor: colors.card }]}><View style={[styles.locationDot, { backgroundColor: colors.primary }]} /></View></View><View style={styles.bottom}><Text style={[styles.kicker, { color: colors.primary }]}>NEARBY</Text><Text style={[styles.title, { color: colors.foreground }]}>Everything worth{'\n'}a little detour.</Text><View style={styles.chips}>{['All', 'Hotels', 'Attractions', 'Properties'].map((item, index) => <Pressable key={item} style={[styles.chip, { backgroundColor: index === 0 ? colors.primary : colors.card, borderColor: colors.border }]}><Text style={[styles.chipText, { color: index === 0 ? colors.primaryForeground : colors.mutedForeground }]}>{item}</Text></Pressable>)}</View></View></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { height: 62, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  map: { flex: 1, marginHorizontal: 12, borderRadius: 24, overflow: 'hidden', position: 'relative' },
  gridHorizontal: { position: 'absolute', left: 0, right: 0, borderTopWidth: 2 },
  gridVertical: { position: 'absolute', top: 0, bottom: 0, borderLeftWidth: 2 },
  road: { position: 'absolute', width: '130%', height: 9, left: '-15%', top: '35%', opacity: 0.9 },
  marker: { position: 'absolute', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', transform: [{ translateX: -16 }] },
  location: { position: 'absolute', left: '47%', top: '46%', width: 24, height: 24, borderRadius: 12, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  locationDot: { width: 9, height: 9, borderRadius: 5 },
  bottom: { padding: 22 },
  kicker: { fontSize: 10, fontWeight: '700', letterSpacing: 1.3 },
  title: { fontSize: 26, lineHeight: 31, fontWeight: '700', letterSpacing: -0.6, marginTop: 7 },
  chips: { flexDirection: 'row', gap: 8, marginTop: 16 },
  chip: { borderWidth: 1, borderRadius: 100, paddingHorizontal: 12, paddingVertical: 9 },
  chipText: { fontSize: 11, fontWeight: '700' },
});