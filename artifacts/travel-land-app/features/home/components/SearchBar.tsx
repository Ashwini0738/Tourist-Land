import React, { useState } from 'react';
import { View, TextInput, Pressable } from 'react-native';
import { PlatformIcon as Feather } from '@/components/PlatformIcon';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';

export function SearchBar() {
  const colors = useColors();
  const [query, setQuery] = useState('');

  return (
    <View style={{ marginTop: 24, marginHorizontal: 20 }}>
      <View style={{ height: 56, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 8 }}>
        <Feather name="search" size={20} color={colors.mutedForeground} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Where do you want to go?"
          placeholderTextColor={colors.mutedForeground}
          style={{ flex: 1, marginLeft: 12, fontSize: 15, color: colors.foreground }}
          returnKeyType="search"
          onSubmitEditing={() => router.push({ pathname: '/(tabs)/explore', params: { query } })}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Search destinations"
          onPress={() => router.push({ pathname: '/(tabs)/explore', params: { query } })}
          style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary }}
        >
          <Feather name="arrow-right" size={18} color={colors.primaryForeground} />
        </Pressable>
      </View>
    </View>
  );
}
