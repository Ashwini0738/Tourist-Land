import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ExploreItem } from '@workspace/api-client-react';
import { PlatformIcon as Feather } from '@/components/PlatformIcon';
import { useColors } from '@/hooks/useColors';

export type MapPoint = {
  item: ExploreItem;
  x: number;
  y: number;
};

const categoryIcons: Record<string, string> = {
  destination: 'map-pin',
  place: 'compass',
  temple: 'sun',
  event: 'calendar',
  hotel: 'home',
  property: 'map',
};

function projectPoints(items: ExploreItem[], center?: { latitude: number; longitude: number }): MapPoint[] {
  const points = items.filter((item) => item.coordinates);
  if (!points.length) return [];
  const fallbackCenter = points[0].coordinates!;
  const mapCenter = center ?? fallbackCenter;
  const spanX = Math.max(0.05, ...points.map((item) => Math.abs(item.coordinates!.longitude - mapCenter.longitude) * 2.2));
  const spanY = Math.max(0.05, ...points.map((item) => Math.abs(item.coordinates!.latitude - mapCenter.latitude) * 2.2));
  return points.map((item) => ({
    item,
    x: Math.max(7, Math.min(93, 50 + ((item.coordinates!.longitude - mapCenter.longitude) / spanX) * 86)),
    y: Math.max(10, Math.min(88, 50 - ((item.coordinates!.latitude - mapCenter.latitude) / spanY) * 70)),
  }));
}

export function MapCanvas({
  items,
  selectedKey,
  center,
  onSelect,
}: {
  items: ExploreItem[];
  selectedKey?: string;
  center?: { latitude: number; longitude: number };
  onSelect: (item: ExploreItem | null) => void;
}) {
  const colors = useColors();
  const points = projectPoints(items, center);
  return (
    <View
      testID="map-canvas"
      accessibilityLabel="Interactive catalog map"
      style={[styles.canvas, { backgroundColor: colors.secondary }]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Clear selected map item"
        onPress={() => onSelect(null)}
        style={StyleSheet.absoluteFill}
      >
        <View style={[styles.water, { backgroundColor: colors.primary, opacity: 0.08 }]} />
        <View style={[styles.contour, styles.contourOne, { borderColor: colors.card }]} />
        <View style={[styles.contour, styles.contourTwo, { borderColor: colors.card }]} />
        <View style={[styles.road, styles.roadOne, { backgroundColor: colors.card }]} />
        <View style={[styles.road, styles.roadTwo, { backgroundColor: colors.card }]} />
        {points.map(({ item, x, y }) => {
          const selected = `${item.type}:${item.id}` === selectedKey;
          return (
            <Pressable
              key={`${item.type}:${item.id}`}
              testID={`map-marker-${item.type}-${item.id}`}
              accessibilityRole="button"
              accessibilityLabel={`Select ${item.title} on map`}
              onPress={(event) => {
                event?.stopPropagation?.();
                onSelect(item);
              }}
              style={[
                styles.marker,
                { left: `${x}%`, top: `${y}%`, backgroundColor: selected ? colors.accent : colors.card, borderColor: colors.primary },
                selected && styles.selectedMarker,
              ]}
            >
              <Feather name={categoryIcons[item.type] ?? 'map-pin'} size={selected ? 16 : 13} color={selected ? colors.accentForeground : colors.primary} />
            </Pressable>
          );
        })}
      </Pressable>
      {points.length === 0 ? (
        <View pointerEvents="none" style={styles.emptyMap}>
          <Feather name="map" size={26} color={colors.primary} />
          <Text style={[styles.emptyMapTitle, { color: colors.foreground }]}>Your atlas is ready</Text>
          <Text style={[styles.emptyMapText, { color: colors.mutedForeground }]}>Search for a destination to place it on the map.</Text>
        </View>
      ) : null}
      <View pointerEvents="none" style={[styles.scale, { backgroundColor: colors.foreground }]} />
      <Text pointerEvents="none" style={[styles.scaleLabel, { color: colors.mutedForeground }]}>CATALOG ATLAS</Text>
    </View>
  );
}

export function MapSkeleton() {
  const colors = useColors();
  return (
    <View testID="map-skeleton" style={[styles.canvas, { backgroundColor: colors.secondary }]}>
      {[0, 1, 2, 3].map((item) => (
        <View key={item} style={[styles.skeletonMarker, { left: `${18 + item * 19}%`, top: `${28 + (item % 2) * 22}%`, backgroundColor: colors.muted }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: { flex: 1, minHeight: 270, overflow: 'hidden', position: 'relative' },
  water: { position: 'absolute', width: '90%', height: '55%', left: '-35%', top: '-15%', borderRadius: 220, transform: [{ rotate: '-18deg' }] },
  contour: { position: 'absolute', borderWidth: 1, borderRadius: 180, opacity: 0.7 },
  contourOne: { width: '120%', height: '55%', left: '-12%', top: '19%', transform: [{ rotate: '-12deg' }] },
  contourTwo: { width: '105%', height: '50%', left: '3%', top: '36%', transform: [{ rotate: '17deg' }] },
  road: { position: 'absolute', height: 8, width: '130%', left: '-15%', opacity: 0.72, borderRadius: 8 },
  roadOne: { top: '42%', transform: [{ rotate: '22deg' }] },
  roadTwo: { top: '67%', transform: [{ rotate: '-28deg' }] },
  marker: { position: 'absolute', width: 30, height: 30, marginLeft: -15, marginTop: -15, borderRadius: 15, borderWidth: 2, alignItems: 'center', justifyContent: 'center', shadowColor: '#1f2a24', shadowOpacity: 0.15, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  selectedMarker: { width: 42, height: 42, marginLeft: -21, marginTop: -21, borderRadius: 21, borderWidth: 3 },
  emptyMap: { position: 'absolute', left: 28, right: 28, top: '32%', alignItems: 'center' },
  emptyMapTitle: { fontSize: 16, fontWeight: '700', marginTop: 9 },
  emptyMapText: { fontSize: 12, lineHeight: 17, textAlign: 'center', marginTop: 5 },
  scale: { position: 'absolute', right: 18, bottom: 23, width: 38, height: 2 },
  scaleLabel: { position: 'absolute', right: 18, bottom: 8, fontSize: 8, letterSpacing: 1, fontWeight: '800' },
  skeletonMarker: { position: 'absolute', width: 22, height: 22, borderRadius: 11, opacity: 0.85 },
});