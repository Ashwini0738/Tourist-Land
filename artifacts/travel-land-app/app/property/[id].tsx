import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { properties } from '@/lib/content';
import { useColors } from '@/hooks/useColors';

export default function PropertyDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const property = properties.find((item) => item.id === id) ?? properties[0];
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}><View style={styles.hero}><Image source={property.image} style={styles.image} /><View style={styles.shade} /><Pressable style={[styles.back, { top: insets.top + 10 }]} onPress={() => router.back()}><Feather name="arrow-left" size={21} color={colors.foreground} /></Pressable><View style={styles.heroCopy}><Text style={styles.verified}>VERIFIED OPPORTUNITY</Text><Text style={styles.title}>{property.title}</Text><Text style={styles.location}>{property.location}</Text></View></View><View style={styles.body}><View style={styles.priceRow}><Text style={[styles.price, { color: colors.primary }]}>{property.price}</Text><Text style={[styles.type, { color: colors.mutedForeground }]}>{property.type}</Text></View><Text style={[styles.description, { color: colors.foreground }]}>{property.description}</Text><View style={[styles.details, { backgroundColor: colors.card, borderColor: colors.border }]}><View><Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>LAND SIZE</Text><Text style={[styles.detailValue, { color: colors.foreground }]}>{property.size}</Text></View><View><Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>TITLE STATUS</Text><Text style={[styles.detailValue, { color: colors.foreground }]}>Clear</Text></View><View><Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>ACCESS</Text><Text style={[styles.detailValue, { color: colors.foreground }]}>Road</Text></View></View><Pressable onPress={() => router.push('/booking')} style={[styles.cta, { backgroundColor: colors.primary }]}><Text style={[styles.ctaText, { color: colors.primaryForeground }]}>Request property details</Text><Feather name="arrow-right" size={17} color={colors.primaryForeground} /></Pressable><Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>A sourcing specialist will share the full document pack and arrange a site visit.</Text></View></ScrollView>;
}

const styles = StyleSheet.create({
  container: { paddingBottom: 42 },
  hero: { height: 420, position: 'relative' },
  image: { ...StyleSheet.absoluteFillObject, width: undefined, height: undefined },
  shade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(17,35,27,0.36)' },
  back: { position: 'absolute', left: 20 },
  heroCopy: { position: 'absolute', left: 20, right: 20, bottom: 28 },
  verified: { color: '#f4c17f', fontSize: 10, letterSpacing: 1.3, fontWeight: '700', marginBottom: 10 },
  title: { color: '#fff', fontSize: 34, lineHeight: 39, fontWeight: '700' },
  location: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 6 },
  body: { padding: 22 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  price: { fontSize: 25, fontWeight: '700' },
  type: { fontSize: 12 },
  description: { fontSize: 17, lineHeight: 25, marginTop: 18 },
  details: { borderWidth: 1, borderRadius: 18, padding: 16, marginTop: 24, flexDirection: 'row', justifyContent: 'space-between' },
  detailLabel: { fontSize: 9, letterSpacing: 1.1, fontWeight: '700' },
  detailValue: { fontSize: 14, fontWeight: '700', marginTop: 7 },
  cta: { marginTop: 24, padding: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  ctaText: { fontSize: 14, fontWeight: '700' },
  disclaimer: { textAlign: 'center', fontSize: 12, lineHeight: 18, marginTop: 13 },
});