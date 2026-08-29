import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PlatformIcon as Feather } from '@/components/PlatformIcon';
import { useColors } from '@/hooks/useColors';
import { useAppState } from '@/context/AppStateContext';
import { getImageSource } from '@/features/home/utils/images';

export default function ExploreDetailScreen() {
  const params = useLocalSearchParams<{
    id: string;
    title?: string;
    location?: string;
    category?: string;
    summary?: string;
    imageKey?: string;
    dateLabel?: string;
    favoriteId?: string;
  }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isFavorite, toggleFavorite } = useAppState();
  const id = params.id ?? 'explore-item';
  const title = params.title ?? 'Discovery preview';
  const location = params.location ?? 'Travel & Land';
  const category = params.category ?? 'Discovery';
  const favoriteId = params.favoriteId ?? `${category.toLowerCase()}:${id}`;
  const imageKey = params.imageKey ?? 'highlands';

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <Image source={getImageSource(imageKey)} style={styles.heroImage} />
        <View style={styles.heroShade} />
        <View style={[styles.heroActions, { top: insets.top + 10 }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.actionButton}>
            <Feather name="arrow-left" size={20} color="#fff" />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`${isFavorite(favoriteId) ? 'Remove' : 'Add'} ${title} ${isFavorite(favoriteId) ? 'from' : 'to'} favorites`} onPress={() => toggleFavorite(favoriteId)} style={styles.actionButton}>
            <Feather name="heart" size={19} color={isFavorite(favoriteId) ? '#ef4444' : '#fff'} fill={isFavorite(favoriteId) ? '#ef4444' : 'transparent'} />
          </Pressable>
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.kicker}>{category.toUpperCase()}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.location}>{location}</Text>
        </View>
      </View>
      <View style={styles.body}>
        <View style={[styles.previewBadge, { backgroundColor: colors.secondary }]}>
          <Feather name="info" size={15} color={colors.primary} />
          <Text style={[styles.previewBadgeText, { color: colors.mutedForeground }]}>Development discovery preview</Text>
        </View>
        {params.dateLabel ? <Text style={[styles.date, { color: colors.primary }]}>{params.dateLabel}</Text> : null}
        <Text style={[styles.description, { color: colors.foreground }]}>{params.summary ?? 'A curated development-content preview to help you discover the places and stories Travel & Land is building toward.'}</Text>
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>ABOUT THIS RESULT</Text>
          <Text style={[styles.infoText, { color: colors.foreground }]}>This page is for discovery only. Availability, schedules, booking status, and real-time visitor information will be connected in a later release.</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/explore')} style={[styles.button, { backgroundColor: colors.primary }]}>
          <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Continue exploring</Text>
          <Feather name="arrow-right" size={17} color={colors.primaryForeground} />
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 42 },
  hero: { height: 420, position: 'relative' },
  heroImage: { ...StyleSheet.absoluteFillObject, width: undefined, height: undefined },
  heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(17,35,27,0.42)' },
  heroActions: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between' },
  actionButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  heroCopy: { position: 'absolute', left: 20, right: 20, bottom: 28 },
  kicker: { color: '#f4c17f', fontSize: 10, fontWeight: '800', letterSpacing: 1.4, marginBottom: 10 },
  title: { color: '#fff', fontSize: 34, lineHeight: 39, fontWeight: '700' },
  location: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 7 },
  body: { padding: 22 },
  previewBadge: { borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  previewBadgeText: { fontSize: 11, fontWeight: '700' },
  date: { fontSize: 13, fontWeight: '800', marginTop: 22 },
  description: { fontSize: 18, lineHeight: 27, marginTop: 18 },
  infoCard: { borderWidth: 1, borderRadius: 17, padding: 16, marginTop: 25 },
  infoLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1.1 },
  infoText: { fontSize: 12, lineHeight: 18, marginTop: 9 },
  button: { borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 24 },
  buttonText: { fontSize: 14, fontWeight: '800' },
});