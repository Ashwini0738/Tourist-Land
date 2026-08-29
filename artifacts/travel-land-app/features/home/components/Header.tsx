import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '@clerk/expo';
import { useHomeLocation } from '../hooks/useHomeLocation';
import { SecurityIcon } from '@/components/SecurityIcon';

export function Header() {
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const { locationName, loading, hasPermission, requestPermission } = useHomeLocation();

  const hour = new Date().getHours();
  let greeting = 'Good evening';
  if (hour < 12) greeting = 'Good morning';
  else if (hour < 17) greeting = 'Good afternoon';

  const firstName = user?.firstName || 'Explorer';

  return (
    <View style={{ backgroundColor: '#111827', paddingTop: insets.top + 16, paddingBottom: 64, paddingHorizontal: 20 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Pressable onPress={!hasPermission ? requestPermission : undefined} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <SecurityIcon name="location" size={28} color="#EF4444" />
          <View>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
              {hasPermission ? (loading ? 'LOCATING...' : (locationName ? locationName.toUpperCase() : 'UNKNOWN')) : 'DISCOVER INDIA'}
            </Text>
            <Text style={{ color: '#94A3B8', fontSize: 13, marginTop: 2 }}>
              {hasPermission ? 'Current location' : 'Location not shared'}
            </Text>
          </View>
          {!hasPermission && <Feather name="chevron-down" size={16} color="#94A3B8" />}
        </Pressable>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Pressable onPress={() => router.push('/notifications')}>
            <Feather name="bell" size={24} color="#94A3B8" />
          </Pressable>
          <Pressable onPress={() => router.push('/profile')}>
            <Feather name="user" size={24} color="#94A3B8" />
          </Pressable>
        </View>
      </View>

      <View style={{ marginTop: 32 }}>
        <Text style={{ color: '#94A3B8', fontSize: 16 }}>{greeting},</Text>
        <Text style={{ color: '#fff', fontSize: 28, fontWeight: '700', marginTop: 4 }}>{firstName}</Text>
      </View>
    </View>
  );
}
