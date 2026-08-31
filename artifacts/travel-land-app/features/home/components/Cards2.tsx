import React from 'react';
import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { PlatformIcon as Feather } from '@/components/PlatformIcon';
import { useColors } from '@/hooks/useColors';
import { getImageSource } from '../utils/images';
import type { Event, Hotel, Property } from '@workspace/api-client-react';
import { elevation, radii, spacing } from '@/constants/theme';

export function EventCard({ item, isFavorite, toggleFavorite }: { item: Event, isFavorite: boolean, toggleFavorite: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={() => router.push(`/destination/${item.destinationId}`)}
      style={{ width: 270, borderRadius: radii.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, padding: spacing.sm, ...elevation.card }}
    >
      <Image source={getImageSource(item.imageKey)} style={{ width: '100%', height: 140, borderRadius: 12 }} />
      <Pressable accessibilityRole="button" accessibilityLabel={`${isFavorite ? 'Remove' : 'Add'} ${item.title} ${isFavorite ? 'from' : 'to'} favorites`} onPress={(event) => { event.stopPropagation(); toggleFavorite(); }} style={{ position: 'absolute', top: 56, right: 20, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' }}>
        <Feather name="heart" size={16} color={isFavorite ? colors.destructive : '#fff'} fill={isFavorite ? colors.destructive : 'transparent'} />
      </Pressable>
      <View style={{ position: 'absolute', top: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{item.dateLabel}</Text>
      </View>
      <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '700', marginTop: 12 }} numberOfLines={1}>{item.title}</Text>
      <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 4 }} numberOfLines={1}>{item.location}</Text>
      <Text style={{ color: colors.foreground, fontSize: 13, marginTop: 8 }} numberOfLines={2}>{item.summary}</Text>
    </Pressable>
  );
}

export function HotelCard({ item, isFavorite, toggleFavorite }: { item: Hotel, isFavorite: boolean, toggleFavorite: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={() => router.push(`/hotel/${item.id}`)}
      style={{ width: 270, borderRadius: radii.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, padding: spacing.sm, ...elevation.card }}
    >
      <Image source={getImageSource(item.imageKey)} style={{ width: '100%', height: 140, borderRadius: 12 }} />
      <Pressable accessibilityRole="button" accessibilityLabel={`${isFavorite ? 'Remove' : 'Add'} ${item.name} ${isFavorite ? 'from' : 'to'} favorites`} onPress={(event) => { event.stopPropagation(); toggleFavorite(); }} style={{ position: 'absolute', top: 20, right: 20, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' }}>
        <Feather name="heart" size={16} color={isFavorite ? colors.destructive : '#fff'} fill={isFavorite ? colors.destructive : 'transparent'} />
      </Pressable>
      
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 12 }}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '700' }} numberOfLines={1}>{item.name}</Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 2 }} numberOfLines={1}>{item.location}</Text>
        </View>
        <Text style={{ color: '#EAB308', fontSize: 13, fontWeight: '700' }}>★ {item.ratingLabel}</Text>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
        <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: '700' }}>{item.priceLabel}</Text>
        <View style={{ backgroundColor: colors.secondary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
          <Text style={{ color: colors.secondaryForeground, fontSize: 10, fontWeight: '700' }}>SAMPLE</Text>
        </View>
      </View>
    </Pressable>
  );
}

export function PropertyCard({ item, isFavorite, toggleFavorite }: { item: Property, isFavorite: boolean, toggleFavorite: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={() => router.push(`/property/${item.id}`)}
      style={{ width: 286, borderRadius: radii.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, padding: spacing.sm, ...elevation.card }}
    >
      <Image source={getImageSource(item.imageKey)} style={{ width: '100%', height: 160, borderRadius: 12 }} />
      <Pressable accessibilityRole="button" accessibilityLabel={`${isFavorite ? 'Remove' : 'Add'} property ${isFavorite ? 'from' : 'to'} favorites`} onPress={(event) => { event.stopPropagation(); toggleFavorite(); }} style={{ position: 'absolute', top: 20, right: 20, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' }}>
        <Feather name="heart" size={16} color={isFavorite ? colors.destructive : '#fff'} fill={isFavorite ? colors.destructive : 'transparent'} />
      </Pressable>
      <View style={{ position: 'absolute', top: 20, left: 20, backgroundColor: colors.primary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
        <Text style={{ color: colors.primaryForeground, fontSize: 10, fontWeight: '700' }}>DEVELOPMENT</Text>
      </View>
      
      <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '700', marginTop: 12 }} numberOfLines={1}>{item.location}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
        <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>{item.propertyType}</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>•</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>{item.area}</Text>
      </View>
      <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: '700', marginTop: 12 }}>{item.priceLabel}</Text>
    </Pressable>
  );
}
