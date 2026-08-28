import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '@clerk/expo';
import { destinations, stays } from '@/lib/content';
import { useColors } from '@/hooks/useColors';
import { useAppState } from '@/context/AppStateContext';

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { toggleFavorite, isFavorite } = useAppState();
  const { user } = useUser();
  const [query, setQuery] = useState('');

  const quickActions = [
    { label: 'Explore', icon: 'compass', route: '/explore' },
    { label: 'Hotels', icon: 'home', route: '/hotels' },
    { label: 'Bookings', icon: 'calendar', route: '/bookings' },
    { label: 'Maps', icon: 'map', route: '/maps' },
    { label: 'Land', icon: 'map-pin', route: '/land' },
    { label: 'Saved', icon: 'heart', route: '/saved' },
    { label: 'Alerts', icon: 'bell', route: '/notifications' },
    { label: 'Support', icon: 'help-circle', route: '/profile' },
  ] as const;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: Platform.OS === 'web' ? 102 : 118 }}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      {/* Dark Header */}
      <View style={{ backgroundColor: '#111827', paddingTop: insets.top + 16, paddingBottom: 64, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <MaterialCommunityIcons name="map-marker-radius" size={28} color="#EF4444" />
            <View>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>DISCOVER INDIA</Text>
              <Text style={{ color: '#94A3B8', fontSize: 13, marginTop: 2 }}>Travel and land opportunities</Text>
            </View>
            <Feather name="chevron-down" size={16} color="#94A3B8" />
          </View>
          <Feather name="globe" size={24} color="#94A3B8" />
        </View>

        <View style={{ marginTop: 32 }}>
          <Text style={{ color: '#94A3B8', fontSize: 16 }}>Hello,</Text>
          <Text style={{ color: '#fff', fontSize: 28, fontWeight: '700', marginTop: 4 }}>{user?.firstName || 'Explorer'}</Text>
        </View>
      </View>

      {/* Overlapping Card */}
      <View style={{ marginTop: -32, marginHorizontal: 20, flexDirection: 'row', height: 110, borderRadius: 20, overflow: 'visible', backgroundColor: colors.card, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 }}>
        <View style={{ flex: 1, padding: 20, justifyContent: 'center', borderTopLeftRadius: 20, borderBottomLeftRadius: 20, backgroundColor: colors.card }}>
           <Text style={{ color: colors.mutedForeground, fontSize: 13, fontWeight: '600' }}>Trip inspiration</Text>
           <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: '700', marginTop: 6 }}>{destinations[0]?.name || 'Explore India'}</Text>
           <Text style={{ color: '#EAB308', fontSize: 13, fontWeight: '700', marginTop: 6 }}>Discover now</Text>
        </View>
        <Pressable onPress={() => router.push('/wallet')} style={{ flex: 0.8, backgroundColor: '#BE123C', padding: 20, justifyContent: 'center', alignItems: 'center', borderTopRightRadius: 20, borderBottomRightRadius: 20 }}>
           <MaterialCommunityIcons name="wallet-outline" size={32} color="#fff" />
           <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700', marginTop: 8 }}>My Wallet</Text>
        </Pressable>

        <Pressable accessibilityRole="button" accessibilityLabel="Open travel maps" onPress={() => router.push('/maps')} style={{ position: 'absolute', top: '50%', left: '55.5%', width: 68, height: 68, borderRadius: 34, backgroundColor: colors.card, transform: [{translateX: -34}, {translateY: -34}], alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 8, borderWidth: 4, borderColor: '#111827' }}>
          <MaterialCommunityIcons name="map-search-outline" size={28} color={colors.foreground} />
        </Pressable>
      </View>

      {/* Search Bar */}
      <View style={{ marginTop: 24, marginHorizontal: 20 }}>
        <Pressable style={{ height: 56, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 }} onPress={() => router.push({ pathname: '/(tabs)/explore', params: { query } })}>
          <Feather name="search" size={20} color={colors.mutedForeground} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search destinations, stays..."
            placeholderTextColor={colors.mutedForeground}
            style={{ flex: 1, marginLeft: 12, fontSize: 15, color: colors.foreground }}
            returnKeyType="search"
            onSubmitEditing={() => router.push({ pathname: '/(tabs)/explore', params: { query } })}
          />
        </Pressable>
      </View>

      {/* Quick Actions */}
      <Text style={{ fontSize: 18, fontWeight: '700', marginHorizontal: 20, marginTop: 32, marginBottom: 20, color: colors.foreground }}>Explore Services</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10 }}>
        {quickActions.map((action) => (
          <Pressable key={action.label} onPress={() => router.push(action.route)} style={{ width: '25%', alignItems: 'center', marginBottom: 24 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 2 }}>
               <Feather name={action.icon as any} size={24} color={colors.primary} />
            </View>
            <Text style={{ fontSize: 12, marginTop: 10, color: colors.foreground, fontWeight: '600' }}>{action.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Featured Destinations */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 20, marginTop: 16, marginBottom: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground }}>Featured Destinations</Text>
        <Pressable onPress={() => router.push('/(tabs)/explore')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.mutedForeground }}>VIEW ALL</Text>
          <View style={{ backgroundColor: '#22C55E', borderRadius: 12, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="arrow-right" size={12} color="#fff" />
          </View>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingHorizontal: 20, paddingBottom: 24 }}>
        {destinations.map((destination) => (
          <Pressable
            key={destination.id}
            onPress={() => router.push(`/destination/${destination.id}`)}
            style={{ width: 280, height: 180, borderRadius: 20, overflow: 'hidden' }}
          >
            <Image source={destination.image} style={{ ...StyleSheet.absoluteFillObject, width: undefined, height: undefined }} />
            <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' }} />
            <View style={{ position: 'absolute', bottom: 20, left: 20 }}>
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>{destination.name}</Text>
              <Text style={{ color: '#fff', fontSize: 13, opacity: 0.9, marginTop: 4 }}>{destination.region}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {/* Small Stays */}
      <View style={{ marginHorizontal: 20, marginTop: 16, marginBottom: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground }}>Small Stays</Text>
      </View>
      <View style={{ paddingHorizontal: 20, paddingBottom: 40, gap: 16 }}>
        {stays.map((stay) => (
          <Pressable key={stay.id} style={{ borderWidth: 1, borderRadius: 20, padding: 12, flexDirection: 'row', backgroundColor: colors.card, borderColor: colors.border }} onPress={() => router.push(`/hotel/${stay.id}`)}>
            <Image source={stay.image} style={{ width: 96, height: 96, borderRadius: 14 }} />
            <View style={{ flex: 1, marginLeft: 16, paddingVertical: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground, flex: 1, marginRight: 8 }}>{stay.name}</Text>
                <Pressable testID={`favorite-${stay.id}`} onPress={() => toggleFavorite(stay.id)} hitSlop={10}>
                  <Feather name="heart" size={20} color={isFavorite(stay.id) ? colors.destructive : colors.mutedForeground} fill={isFavorite(stay.id) ? colors.destructive : 'transparent'} />
                </Pressable>
              </View>
              <Text style={{ fontSize: 13, marginTop: 6, color: colors.mutedForeground }}>{stay.location}</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.foreground }}>{stay.price}<Text style={{ color: colors.mutedForeground, fontWeight: '500' }}> / night</Text></Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.foreground }}><Feather name="star" size={14} color="#EAB308" /> {stay.rating}</Text>
              </View>
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
