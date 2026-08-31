import { PlatformIcon as Feather } from '@/components/PlatformIcon';
import { getFavoriteKey, useAppState } from '@/context/AppStateContext';
import { useColors } from '@/hooks/useColors';
import { properties } from '@/lib/content';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default function PropertyDetail() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const propertyId = firstParam(params.id) ?? '';
  const property = properties.find((item) => item.id === propertyId);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isFavorite, toggleFavorite } = useAppState();

  if (!property) {
    return (
      <View testID="property-not-found" style={[styles.notFound, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <Feather name="map-pin" size={28} color={colors.destructive} />
        <Text style={[styles.notFoundTitle, { color: colors.foreground }]}>Property not found.</Text>
        <Text style={[styles.notFoundBody, { color: colors.mutedForeground }]}>This listing may be unavailable or the link may be out of date.</Text>
        <Pressable accessibilityRole="button" onPress={() => router.replace('/(tabs)/land')} style={[styles.cta, { backgroundColor: colors.primary }]}>
          <Text style={[styles.ctaText, { color: colors.primaryForeground }]}>Back to Land</Text>
        </Pressable>
      </View>
    );
  }

  const favoriteId = getFavoriteKey('property', property.id);
  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <Image source={property.image} style={styles.image} />
        <View style={styles.shade} />
        <View style={[styles.heroActions, { top: insets.top + 10 }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" style={styles.action} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/land')}>
            <Feather name="arrow-left" size={21} color={colors.foreground} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`${isFavorite(favoriteId) ? 'Remove' : 'Add'} ${property.title} ${isFavorite(favoriteId) ? 'from' : 'to'} favorites`} style={styles.action} onPress={() => toggleFavorite(favoriteId)}>
            <Feather name="heart" size={20} color={isFavorite(favoriteId) ? colors.destructive : colors.foreground} fill={isFavorite(favoriteId) ? colors.destructive : 'transparent'} />
          </Pressable>
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.verified}>{property.verified ? 'VERIFIED OPPORTUNITY' : 'PROPERTY OPPORTUNITY'}</Text>
          <Text style={styles.title}>{property.title}</Text>
          <Text style={styles.location}>{property.location}</Text>
        </View>
      </View>
      <View style={styles.body}>
        <View style={styles.priceRow}>
          <Text style={[styles.price, { color: colors.primary }]}>{property.price}</Text>
          <Text style={[styles.type, { color: colors.mutedForeground }]}>{property.type}</Text>
        </View>
        <Text style={[styles.description, { color: colors.foreground }]}>{property.description}</Text>
        <View style={[styles.details, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View><Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>LAND SIZE</Text><Text style={[styles.detailValue, { color: colors.foreground }]}>{property.size}</Text></View>
          <View><Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>VERIFICATION</Text><Text style={[styles.detailValue, { color: colors.foreground }]}>{property.verified ? 'Reviewed' : 'Pending'}</Text></View>
        </View>
        <Pressable accessibilityRole="button" onPress={() => router.push('/maps')} style={[styles.mapLink, { borderColor: colors.border }]}>
          <Feather name="map" size={17} color={colors.primary} />
          <Text style={[styles.mapLinkText, { color: colors.primary }]}>View location on map</Text>
          <Feather name="chevron-right" size={17} color={colors.mutedForeground} />
        </Pressable>
        <Pressable
          testID="property-enquire"
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/property-enquiry', params: { property: property.title, propertyId: property.id } })}
          style={[styles.cta, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.ctaText, { color: colors.primaryForeground }]}>Request property details</Text>
          <Feather name="arrow-right" size={17} color={colors.primaryForeground} />
        </Pressable>
        <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>Submitting records an enquiry only. It does not create a transaction, reserve land, or verify ownership documents.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 42 },
  hero: { height: 420, position: 'relative' },
  image: { ...StyleSheet.absoluteFillObject, width: undefined, height: undefined },
  shade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(17,35,27,0.36)' },
  heroActions: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between' },
  action: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.78)' },
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
  cta: { marginTop: 24, minHeight: 52, paddingHorizontal: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  ctaText: { fontSize: 14, fontWeight: '700' },
  disclaimer: { textAlign: 'center', fontSize: 12, lineHeight: 18, marginTop: 13 },
  mapLink: { borderWidth: 1, borderRadius: 15, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20 },
  mapLinkText: { flex: 1, fontSize: 13, fontWeight: '700' },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  notFoundTitle: { fontSize: 22, fontWeight: '700', marginTop: 14 },
  notFoundBody: { fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 7 },
});