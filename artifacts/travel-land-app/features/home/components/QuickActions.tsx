import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';

const quickActions = [
  { label: 'Explore', icon: 'compass', route: '/(tabs)/explore' },
  { label: 'Destinations', icon: 'map-pin', route: { pathname: '/(tabs)/explore', params: { filter: 'Destinations' } } },
  { label: 'Hotels', icon: 'home', route: '/hotels' },
  { label: 'Maps', icon: 'map', route: '/maps' },
  { label: 'Bookings', icon: 'calendar', route: '/(tabs)/bookings' },
  { label: 'Land', icon: 'layers', route: '/(tabs)/land' },
] as const;

export function QuickActions() {
  const colors = useColors();

  return (
    <>
      <Text style={{ fontSize: 18, fontWeight: '700', marginHorizontal: 20, marginTop: 32, marginBottom: 20, color: colors.foreground }}>Explore Services</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10 }}>
        {quickActions.map((action) => (
          <Pressable 
            key={action.label} 
            accessibilityRole="button"
            accessibilityLabel={`Open ${action.label}`}
            onPress={() => router.push(action.route as any)}
            style={{ width: '33.33%', alignItems: 'center', marginBottom: 24 }}
          >
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 2 }}>
               <Feather name={action.icon as any} size={24} color={colors.primary} />
            </View>
            <Text style={{ fontSize: 12, marginTop: 10, color: colors.foreground, fontWeight: '600' }}>{action.label}</Text>
          </Pressable>
        ))}
      </View>
    </>
  );
}
