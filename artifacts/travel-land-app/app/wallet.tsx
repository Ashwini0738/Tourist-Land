import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

export default function WalletScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
      <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 24 }}>
        <Pressable onPress={() => router.back()} style={{ padding: 8, marginLeft: -8, alignSelf: 'flex-start' }}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </Pressable>

        <Text style={{ fontSize: 28, fontWeight: '700', color: colors.foreground, marginTop: 24 }}>Travel Pass</Text>
        <Text style={{ fontSize: 15, color: colors.mutedForeground, marginTop: 6 }}>Access your bookings and credits</Text>
      </View>

      <View style={{ marginTop: 32, paddingHorizontal: 20 }}>
        {/* Dark Card */}
        <View style={{ backgroundColor: '#0F172A', borderRadius: 24, padding: 24, height: 230, position: 'relative', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 10, zIndex: 2 }}>
          {/* Abstract decoration */}
          <View style={{ position: 'absolute', right: -30, top: -20, opacity: 0.6 }}>
             <MaterialCommunityIcons name="gift-outline" size={160} color="#334155" />
          </View>
          <View style={{ position: 'absolute', right: 40, bottom: -10, opacity: 0.4 }}>
             <MaterialCommunityIcons name="ticket-percent-outline" size={100} color="#475569" />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <MaterialCommunityIcons name="compass-outline" size={32} color="#FACC15" />
            <Text style={{ color: '#FACC15', fontSize: 18, fontWeight: '700', letterSpacing: 2 }}>TRAVEL & LAND</Text>
          </View>

          <View style={{ marginTop: 'auto' }}>
             <Text style={{ color: '#fff', fontSize: 19, fontWeight: '600', letterSpacing: 3, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }}>PASS •••• ••••</Text>
            <Text style={{ color: '#F8FAFC', fontSize: 18, fontWeight: '600', marginTop: 12, letterSpacing: 1 }}>Explorer</Text>
          </View>
        </View>

        {/* Inactive travel pass preview */}
        <View style={{ backgroundColor: colors.card, marginHorizontal: 16, marginTop: -20, borderRadius: 20, padding: 24, paddingTop: 48, borderWidth: 1, borderColor: colors.border, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4, zIndex: 1 }}>
           <MaterialCommunityIcons name="ticket-confirmation-outline" size={64} color={colors.foreground} />
           <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: '700', marginTop: 16 }}>Travel pass preview</Text>
           <Text style={{ color: colors.mutedForeground, fontSize: 13, lineHeight: 19, marginTop: 6, textAlign: 'center' }}>Your secure check-in pass will activate after your first confirmed booking.</Text>
        </View>
      </View>

      <View style={{ marginTop: 40, paddingHorizontal: 24 }}>
         <Text style={{ color: colors.foreground, fontSize: 20, fontWeight: '700' }}>Available Balance</Text>
         <View style={{ marginTop: 16, padding: 24, backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 13, fontWeight: '700', letterSpacing: 1 }}>BOOKING CREDITS</Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 17, fontWeight: '600', marginTop: 12 }}>Balance unavailable</Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 13, marginTop: 6 }}>Pending real data connection.</Text>
         </View>
      </View>

      <View style={{ marginTop: 32, paddingHorizontal: 24 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground }}>Recent activity</Text>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.mutedForeground }}>No transactions</Text>
        </View>
        <View style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, borderRadius: 20, alignItems: 'center', padding: 32, marginTop: 16 }}>
          <Feather name="clock" size={28} color={colors.primary} />
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground, marginTop: 16 }}>No wallet activity yet</Text>
          <Text style={{ textAlign: 'center', fontSize: 14, color: colors.mutedForeground, marginTop: 8 }}>Your booking credits and refunds will show here.</Text>
        </View>
      </View>
    </ScrollView>
  );
}
