import React from 'react';
import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { PlatformIcon as Feather } from '@/components/PlatformIcon';
import { useColors } from '@/hooks/useColors';
import { getImageSource } from '../utils/images';
import type { Banner, Destination, Place } from '@workspace/api-client-react';
import { elevation, radii, spacing } from '@/constants/theme';

export function BannerCard({ item }: { item: Banner }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={() => router.push(`/destination/${item.destinationId}`)}
      style={{ width: 300, height: 196, borderRadius: radii.lg, overflow: 'hidden', ...elevation.card }}
    >
      <Image source={getImageSource(item.imageKey)} style={{ ...StyleSheet.absoluteFillObject, width: undefined, height: undefined }} />
      <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(16,45,58,0.45)' }} />
      <View style={{ position: 'absolute', top: 20, left: 20 }}>
        <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700' }}>{item.title}</Text>
        <Text style={{ color: '#EAB308', fontSize: 13, fontWeight: '700', marginTop: 4 }}>{item.subtitle}</Text>
      </View>
      <View style={{ position: 'absolute', bottom: 20, left: 20, backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}>
        <Text style={{ color: colors.primaryForeground, fontSize: 12, fontWeight: '700' }}>{item.ctaLabel}</Text>
      </View>
    </Pressable>
  );
}

export function DestinationCard({ item, isFavorite, toggleFavorite }: { item: Destination, isFavorite: boolean, toggleFavorite: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={() => router.push(`/destination/${item.id}`)}
      style={{ width: 232, height: 276, borderRadius: radii.lg, overflow: 'hidden', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, ...elevation.card }}
    >
      <Image source={getImageSource(item.imageKey)} style={{ width: '100%', height: 140 }} />
      <Pressable accessibilityRole="button" accessibilityLabel={`${isFavorite ? 'Remove' : 'Add'} ${item.name} ${isFavorite ? 'from' : 'to'} favorites`} onPress={(event) => { event.stopPropagation(); toggleFavorite(); }} style={{ position: 'absolute', top: 12, right: 12, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(16,45,58,0.68)', alignItems: 'center', justifyContent: 'center' }}>
        <Feather name="heart" size={16} color={isFavorite ? colors.destructive : '#fff'} fill={isFavorite ? colors.destructive : 'transparent'} />
      </Pressable>
      <View style={{ padding: spacing.md, flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: '700' }} numberOfLines={1}>{item.name}</Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 2 }} numberOfLines={1}>{item.region}</Text>
          </View>
        </View>
        <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 8 }} numberOfLines={2}>{item.summary}</Text>
      </View>
    </Pressable>
  );
}

export function PlaceCard({ item, isFavorite, toggleFavorite }: { item: Place, isFavorite: boolean, toggleFavorite: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={() => router.push(`/destination/${item.destinationId}`)}
      style={{ width: 232, borderRadius: radii.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, padding: spacing.sm, ...elevation.card }}
    >
      <Image source={getImageSource(item.imageKey)} style={{ width: '100%', height: 120, borderRadius: 12 }} />
      <Pressable accessibilityRole="button" accessibilityLabel={`${isFavorite ? 'Remove' : 'Add'} ${item.name} ${isFavorite ? 'from' : 'to'} favorites`} onPress={(event) => { event.stopPropagation(); toggleFavorite(); }} style={{ position: 'absolute', top: 20, right: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(16,45,58,0.68)', alignItems: 'center', justifyContent: 'center' }}>
        <Feather name="heart" size={16} color={isFavorite ? colors.destructive : '#fff'} fill={isFavorite ? colors.destructive : 'transparent'} />
      </Pressable>
      <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '700', marginTop: 12 }} numberOfLines={1}>{item.name}</Text>
      <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600', marginTop: 2 }}>{item.category}</Text>
      <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 4 }} numberOfLines={1}>{item.location}</Text>
      {(item.distanceLabel || item.ratingLabel) && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
          {item.distanceLabel && <Text style={{ color: colors.mutedForeground, fontSize: 12, fontWeight: '500' }}>{item.distanceLabel}</Text>}
          {item.ratingLabel && <Text style={{ color: '#EAB308', fontSize: 12, fontWeight: '700' }}>★ {item.ratingLabel}</Text>}
        </View>
      )}
    </Pressable>
  );
}
