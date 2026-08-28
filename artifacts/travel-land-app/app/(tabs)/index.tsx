import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '@/components/AppIcon';
import { destinations, stays } from '@/lib/content';
import { useColors } from '@/hooks/useColors';
import { useAppState } from '@/context/AppStateContext';

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { toggleFavorite, isFavorite } = useAppState();
  const [query, setQuery] = React.useState('');

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: Platform.OS === 'web' ? 102 : 118 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topRow}>
        <View>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>GOOD MORNING, EXPLORER</Text>
          <Text style={[styles.greeting, { color: colors.foreground }]}>Go somewhere{'\n'}that feels like you.</Text>
        </View>
        <AppIcon name="bell" onPress={() => router.push('/notifications')} />
      </View>

      <Pressable
        style={[styles.search, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => router.push({ pathname: '/(tabs)/explore', params: { query } })}
      >
        <Feather name="search" size={20} color={colors.mutedForeground} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search destinations, stays, places..."
          placeholderTextColor={colors.mutedForeground}
          style={[styles.searchInput, { color: colors.foreground }]}
          returnKeyType="search"
          onSubmitEditing={() => router.push({ pathname: '/(tabs)/explore', params: { query } })}
        />
        <View style={[styles.filterDot, { backgroundColor: colors.accent }]} />
      </Pressable>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Make room for wonder</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>Places worth taking the long way to</Text>
        </View>
        <Pressable onPress={() => router.push('/(tabs)/explore')}>
          <Text style={[styles.link, { color: colors.primary }]}>See all</Text>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.destinationRail}>
        {destinations.map((destination) => (
          <Pressable
            key={destination.id}
            onPress={() => router.push(`/destination/${destination.id}`)}
            style={({ pressed }) => [styles.destinationCard, { opacity: pressed ? 0.92 : 1 }]}
          >
            <Image source={destination.image} style={styles.destinationImage} />
            <View style={styles.imageShade} />
            <View style={styles.destinationCopy}>
              <View style={[styles.pill, { backgroundColor: destination.accent }]}>
                <Text style={styles.pillText}>{destination.stat}</Text>
              </View>
              <Text style={styles.destinationName}>{destination.name}</Text>
              <Text style={styles.destinationRegion}>{destination.region}</Text>
            </View>
            <View style={styles.destinationArrow}><Feather name="arrow-up-right" size={18} color={colors.foreground} /></View>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Stay somewhere special</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>Small stays with a big sense of place</Text>
        </View>
        <Pressable onPress={() => router.push('/(tabs)/explore')}><Text style={[styles.link, { color: colors.primary }]}>Browse</Text></Pressable>
      </View>

      {stays.map((stay) => (
        <Pressable key={stay.id} style={[styles.stayRow, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push(`/destination/${stay.id}`)}>
          <Image source={stay.image} style={styles.stayImage} />
          <View style={styles.stayInfo}>
            <View style={styles.stayTitleRow}>
              <Text style={[styles.stayName, { color: colors.foreground }]}>{stay.name}</Text>
              <Pressable testID={`favorite-${stay.id}`} onPress={() => toggleFavorite(stay.id)} hitSlop={10}>
                <Feather name="heart" size={19} color={isFavorite(stay.id) ? colors.destructive : colors.mutedForeground} fill={isFavorite(stay.id) ? colors.destructive : 'transparent'} />
              </Pressable>
            </View>
            <Text style={[styles.stayLocation, { color: colors.mutedForeground }]}>{stay.location}</Text>
            <View style={styles.stayMeta}><Text style={[styles.stayPrice, { color: colors.foreground }]}>{stay.price}<Text style={{ color: colors.mutedForeground, fontWeight: '400' }}> / night</Text></Text><Text style={[styles.rating, { color: colors.foreground }]}><Feather name="star" size={13} color={colors.accentForeground} /> {stay.rating}</Text></View>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 },
  greeting: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.8 },
  search: { height: 56, borderRadius: 17, borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 32 },
  searchInput: { flex: 1, marginLeft: 11, fontSize: 14 },
  filterDot: { width: 10, height: 10, borderRadius: 5 },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  sectionSubtitle: { fontSize: 13, marginTop: 5 },
  link: { fontSize: 13, fontWeight: '700', paddingBottom: 2 },
  destinationRail: { gap: 14, paddingBottom: 30 },
  destinationCard: { width: 238, height: 292, borderRadius: 24, overflow: 'hidden', position: 'relative' },
  destinationImage: { ...StyleSheet.absoluteFillObject, width: undefined, height: undefined },
  imageShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(17, 35, 27, 0.24)' },
  destinationCopy: { position: 'absolute', left: 18, bottom: 19 },
  pill: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 100, marginBottom: 10 },
  pillText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  destinationName: { color: '#fff', fontSize: 23, fontWeight: '700', letterSpacing: -0.5 },
  destinationRegion: { color: 'rgba(255,255,255,0.82)', fontSize: 12, marginTop: 4 },
  destinationArrow: { position: 'absolute', right: 14, top: 14, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.86)', alignItems: 'center', justifyContent: 'center' },
  stayRow: { borderWidth: 1, borderRadius: 20, padding: 10, flexDirection: 'row', marginBottom: 12 },
  stayImage: { width: 92, height: 92, borderRadius: 14 },
  stayInfo: { flex: 1, marginLeft: 13, paddingVertical: 2 },
  stayTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  stayName: { fontSize: 16, fontWeight: '700', flex: 1, marginRight: 8 },
  stayLocation: { fontSize: 12, marginTop: 5 },
  stayMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' },
  stayPrice: { fontSize: 14, fontWeight: '700' },
  rating: { fontSize: 12, fontWeight: '600' },
});
