import { PlatformIcon as Feather } from '@/components/PlatformIcon';
import { router } from 'expo-router';
import React from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { properties } from '@/lib/content';
import { useColors } from '@/hooks/useColors';
import { getFavoriteKey, useAppState } from '@/context/AppStateContext';
import { DemoBadge } from '@/components/DemoBadge';

export default function LandScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isFavorite, toggleFavorite } = useAppState();
  const [activeFilter, setActiveFilter] = React.useState('Location');
  const filters = ['Location', 'Type', 'Price', 'Area', 'Purpose', 'Available'];
  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: Platform.OS === 'web' ? 102 : 118 }]} showsVerticalScrollIndicator={false}>
       <View style={styles.header}><View><Text style={[styles.kicker, { color: colors.primary }]}>LAND SOURCING</Text><Text style={[styles.title, { color: colors.foreground }]}>Find your{'\n'}next beginning.</Text><DemoBadge label="Demo land catalogue" /></View><Pressable onPress={() => router.push('/profile')}><Feather name="user" size={21} color={colors.foreground} /></Pressable></View>
      <View style={[styles.intro, { backgroundColor: colors.primary }]}><View style={styles.introIcon}><Feather name="map-pin" size={20} color={colors.primary} /></View><Text style={styles.introTitle}>Land with a little more meaning.</Text><Text style={styles.introText}>Verified opportunities for stays, farms, and the places you’ve been imagining.</Text><Pressable style={[styles.introButton, { backgroundColor: colors.accent }]} onPress={() => router.push('/property/riverstone-estate')}><Text style={[styles.introButtonText, { color: colors.accentForeground }]}>How it works</Text><Feather name="arrow-up-right" size={15} color={colors.accentForeground} /></Pressable></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>{filters.map((filter) => <Pressable key={filter} onPress={() => setActiveFilter(filter)} style={[styles.filter, { backgroundColor: activeFilter === filter ? colors.primary : colors.card, borderColor: activeFilter === filter ? colors.primary : colors.border }]}><Text style={[styles.filterText, { color: activeFilter === filter ? colors.primaryForeground : colors.mutedForeground }]}>{filter}</Text></Pressable>)}</ScrollView>
      <View style={styles.sectionHead}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Opportunities near you</Text><Pressable onPress={() => router.push('/maps')}><Text style={[styles.link, { color: colors.primary }]}>Map</Text></Pressable></View>
      {properties.map((property) => { const favoriteId = getFavoriteKey('property', property.id); return <Pressable key={property.id} onPress={() => router.push(`/property/${property.id}`)} style={[styles.property, { backgroundColor: colors.card, borderColor: colors.border }]}><Image source={property.image} style={styles.propertyImage} /><Pressable accessibilityRole="button" accessibilityLabel={`${isFavorite(favoriteId) ? 'Remove' : 'Add'} ${property.title} ${isFavorite(favoriteId) ? 'from' : 'to'} favorites`} onPress={(event) => { event.stopPropagation(); toggleFavorite(favoriteId); }} style={styles.favorite}><Feather name="heart" size={16} color={isFavorite(favoriteId) ? colors.destructive : '#fff'} fill={isFavorite(favoriteId) ? colors.destructive : 'transparent'} /></Pressable><View style={styles.propertyCopy}><View style={styles.propertyTitleRow}><Text style={[styles.propertyTitle, { color: colors.foreground }]}>{property.title}</Text>{property.verified ? <View style={[styles.verified, { backgroundColor: colors.secondary }]}><Feather name="check" size={12} color={colors.primary} /></View> : null}</View><Text style={[styles.location, { color: colors.mutedForeground }]}>{property.location}</Text><View style={styles.propertyMeta}><Text style={[styles.size, { color: colors.foreground }]}>{property.size}</Text><Text style={[styles.price, { color: colors.primary }]}>{property.price}</Text></View><Text style={[styles.propertyType, { color: colors.mutedForeground }]}>{property.type}</Text></View></Pressable>; })}
      <View style={[styles.note, { borderColor: colors.border }]}><Feather name="shield" size={18} color={colors.primary} /><View style={{ flex: 1, marginLeft: 12 }}><Text style={[styles.noteTitle, { color: colors.foreground }]}>A considered way to buy land</Text><Text style={[styles.noteText, { color: colors.mutedForeground }]}>Every listing is reviewed before it reaches the app.</Text></View></View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.8 },
  intro: { borderRadius: 23, padding: 20, marginBottom: 29 },
  introIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  introTitle: { color: '#fff', fontSize: 22, lineHeight: 27, fontWeight: '700', maxWidth: 240 },
  introText: { color: 'rgba(255,255,255,0.76)', fontSize: 13, lineHeight: 19, marginTop: 9, maxWidth: 280 },
  introButton: { alignSelf: 'flex-start', borderRadius: 100, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 19 },
  introButtonText: { fontSize: 12, fontWeight: '700' },
  filters: { gap: 8, paddingBottom: 22 },
  filter: { borderWidth: 1, borderRadius: 100, paddingHorizontal: 14, paddingVertical: 9 },
  filterText: { fontSize: 11, fontWeight: '700' },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 19, fontWeight: '700' },
  link: { fontSize: 13, fontWeight: '700' },
  property: { borderWidth: 1, borderRadius: 20, padding: 10, flexDirection: 'row', marginBottom: 12 },
  favorite: { position: 'absolute', top: 18, right: 18, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.38)' },
  propertyImage: { width: 105, height: 130, borderRadius: 14 },
  propertyCopy: { flex: 1, paddingLeft: 13, paddingVertical: 4 },
  propertyTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  propertyTitle: { fontSize: 16, fontWeight: '700', flex: 1 },
  verified: { width: 23, height: 23, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  location: { fontSize: 12, marginTop: 6 },
  propertyMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' },
  size: { fontSize: 13, fontWeight: '600' },
  price: { fontSize: 15, fontWeight: '700' },
  propertyType: { fontSize: 11, marginTop: 6 },
  note: { borderWidth: 1, borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  noteTitle: { fontSize: 13, fontWeight: '700' },
  noteText: { fontSize: 12, lineHeight: 17, marginTop: 4 },
});