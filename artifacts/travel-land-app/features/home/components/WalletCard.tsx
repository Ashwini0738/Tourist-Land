import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { SecurityIcon } from '@/components/SecurityIcon';

export function WalletCard() {
  const colors = useColors();

  return (
    <View style={{ marginTop: -32, marginHorizontal: 20, flexDirection: 'row', height: 110, borderRadius: 20, overflow: 'visible', backgroundColor: colors.card, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 }}>
      <View style={{ flex: 1, padding: 20, justifyContent: 'center', borderTopLeftRadius: 20, borderBottomLeftRadius: 20, backgroundColor: colors.card }}>
         <Text style={{ color: colors.mutedForeground, fontSize: 13, fontWeight: '600' }}>Trip inspiration</Text>
         <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: '700', marginTop: 6 }}>Explore the World</Text>
         <Text style={{ color: '#EAB308', fontSize: 13, fontWeight: '700', marginTop: 6 }}>Discover now</Text>
      </View>
      <Pressable onPress={() => router.push('/wallet')} style={{ flex: 0.8, backgroundColor: '#BE123C', padding: 20, justifyContent: 'center', alignItems: 'center', borderTopRightRadius: 20, borderBottomRightRadius: 20 }}>
          <SecurityIcon name="wallet" size={32} color="#fff" />
         <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700', marginTop: 8 }}>My Wallet</Text>
      </Pressable>

      <Pressable accessibilityRole="button" accessibilityLabel="Open travel maps" onPress={() => router.push('/maps')} style={{ position: 'absolute', top: '50%', left: '55.5%', width: 68, height: 68, borderRadius: 34, backgroundColor: colors.card, transform: [{translateX: -34}, {translateY: -34}], alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 8, borderWidth: 4, borderColor: '#111827' }}>
        <SecurityIcon name="map" size={28} color={colors.foreground} />
      </Pressable>
    </View>
  );
}
