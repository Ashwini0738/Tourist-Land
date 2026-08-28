import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { destinations, stays } from '@/lib/content';
import { useColors } from '@/hooks/useColors';

const filters = ['All places', 'Destinations', 'Stays', 'Food & drink'];

export default function ExploreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ query?: string }>();
  const [query, setQuery] = React.useState(params.query ?? '');
  const [activeFilter, setActiveFilter] = React.useState('All places');
  const normalized = query.trim().toLowerCase();
  const matches = [...destinations, ...stays].filter((item) => {
    if (!normalized) return true;
    return `${item.name} ${'region' in item ? item.region : item.location}`.toLowerCase().includes(normalized);
  });

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: Platform.OS === 'web' ? 102 : 118 }]} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <View><Text style={[styles.kicker, { color: colors.primary }]}>EXPLORE</Text><Text style={[styles.title, { color: colors.foreground }]}>Follow your{'\n'}curiosity.</Text></View>
        <Pressable onPress={() => router.push('/notifications')}><Feather name="bell" size={21} color={colors.foreground} /></Pressable>
      </View>
      <View style={[styles.search, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="search" size={19} color={colors.mutedForeground} />
        <TextInput value={query} onChangeText={setQuery} placeholder="Search anywhere" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground }]} />
        {query ? <Pressable onPress={() => setQuery('')}><Feather name="x-circle" size={18} color={colors.mutedForeground} /></Pressable> : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {filters.map((filter) => <Pressable key={filter} onPress={() => setActiveFilter(filter)} style={[styles.filter, { backgroundColor: activeFilter === filter ? colors.primary : colors.card, borderColor: activeFilter === filter ? colors.primary : colors.border }]}><Text style={[styles.filterText, { color: activeFilter === filter ? colors.primaryForeground : colors.mutedForeground }]}>{filter}</Text></Pressable>)}
      </ScrollView>
      <Text style={[styles.resultLabel, { color: colors.mutedForeground }]}>{normalized ? `${matches.length} results for “${query}”` : 'CURATED FOR THIS SEASON'}</Text>
      {matches.map((item) => {
        const region = 'region' in item ? item.region : item.location;
        const image = item.image;
        return <Pressable key={item.id} onPress={() => router.push(`/destination/${item.id}`)} style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Image source={image} style={styles.resultImage} />
          <View style={styles.resultCopy}><Text style={[styles.resultName, { color: colors.foreground }]}>{item.name}</Text><Text style={[styles.resultLocation, { color: colors.mutedForeground }]}>{region}</Text><View style={styles.resultBottom}><Text style={[styles.resultType, { color: colors.primary }]}>{'tagline' in item ? 'DESTINATION' : 'STAY'}</Text><Feather name="arrow-up-right" size={17} color={colors.foreground} /></View></View>
        </Pressable>;
      })}
      {matches.length === 0 ? <View style={styles.empty}><Feather name="compass" size={28} color={colors.primary} /><Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nothing here yet</Text><Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Try a different place or search term.</Text></View> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.8 },
  search: { height: 54, borderWidth: 1, borderRadius: 16, alignItems: 'center', flexDirection: 'row', paddingHorizontal: 15 },
  input: { flex: 1, fontSize: 14, marginLeft: 10 },
  filters: { gap: 8, paddingVertical: 22 },
  filter: { borderWidth: 1, borderRadius: 100, paddingHorizontal: 15, paddingVertical: 9 },
  filterText: { fontSize: 12, fontWeight: '600' },
  resultLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 13 },
  resultCard: { borderWidth: 1, borderRadius: 20, padding: 10, flexDirection: 'row', marginBottom: 12 },
  resultImage: { width: 112, height: 124, borderRadius: 14 },
  resultCopy: { flex: 1, paddingHorizontal: 13, paddingVertical: 4 },
  resultName: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  resultLocation: { fontSize: 12, marginTop: 6 },
  resultBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' },
  resultType: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  empty: { alignItems: 'center', paddingVertical: 70 },
  emptyTitle: { fontWeight: '700', fontSize: 18, marginTop: 12 },
  emptyText: { fontSize: 13, marginTop: 6 },
});