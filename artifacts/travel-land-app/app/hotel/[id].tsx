import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { stays } from '@/lib/content';
import { useColors } from '@/hooks/useColors';

export default function HotelDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const stay = stays.find((item) => item.id === id) ?? stays[0];
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}><View style={styles.hero}><Image source={stay.image} style={styles.image} /><View style={styles.shade} /><Pressable style={[styles.back, { top: insets.top + 10 }]} onPress={() => router.back()}><Feather name="arrow-left" size={21} color={colors.foreground} /></Pressable><View style={styles.heroCopy}><Text style={styles.kicker}>STAY DETAILS</Text><Text style={styles.title}>{stay.name}</Text><Text style={styles.location}>{stay.location} · 4.9 rating</Text></View></View><View style={styles.body}><Text style={[styles.description, { color: colors.foreground }]}>A considered stay rooted in its surroundings, with quiet rooms, warm hosts, and mornings that don’t need an alarm.</Text><View style={[styles.info, { borderColor: colors.border }]}><View><Text style={[styles.label, { color: colors.mutedForeground }]}>FROM</Text><Text style={[styles.value, { color: colors.foreground }]}>{stay.price} / night</Text></View><View><Text style={[styles.label, { color: colors.mutedForeground }]}>GUESTS</Text><Text style={[styles.value, { color: colors.foreground }]}>2 guests</Text></View></View><Pressable onPress={() => router.push('/booking')} style={[styles.button, { backgroundColor: colors.primary }]}><Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Select dates</Text><Feather name="arrow-right" size={17} color={colors.primaryForeground} /></Pressable></View></ScrollView>;
}

const styles = StyleSheet.create({
  container: { paddingBottom: 40 },
  hero: { height: 430, position: 'relative' },
  image: { ...StyleSheet.absoluteFillObject, width: undefined, height: undefined },
  shade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(17,35,27,0.34)' },
  back: { position: 'absolute', left: 20 },
  heroCopy: { position: 'absolute', left: 20, right: 20, bottom: 28 },
  kicker: { color: '#f4c17f', fontSize: 10, fontWeight: '700', letterSpacing: 1.4 },
  title: { color: '#fff', fontSize: 33, fontWeight: '700', marginTop: 9 },
  location: { color: 'rgba(255,255,255,0.78)', fontSize: 13, marginTop: 6 },
  body: { padding: 22 },
  description: { fontSize: 18, lineHeight: 27 },
  info: { borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 17, flexDirection: 'row', justifyContent: 'space-between', marginTop: 25 },
  label: { fontSize: 10, fontWeight: '700', letterSpacing: 1.1 },
  value: { fontSize: 14, fontWeight: '700', marginTop: 7 },
  button: { borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 24 },
  buttonText: { fontSize: 14, fontWeight: '700' },
});