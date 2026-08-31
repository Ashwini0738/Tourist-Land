import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { PlatformIcon as Feather } from '@/components/PlatformIcon';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { elevation, radii, spacing } from '@/constants/theme';

export function SearchBar() {
  const colors = useColors();
  const [query, setQuery] = useState('');

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>START WITH A PLACE</Text>
      <View style={[styles.search, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="search" size={20} color={colors.mutedForeground} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Where do you want to go?"
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, { color: colors.foreground }]}
          returnKeyType="search"
          onSubmitEditing={() => router.push({ pathname: '/(tabs)/explore', params: { query } })}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Search destinations"
          onPress={() => router.push({ pathname: '/(tabs)/explore', params: { query } })}
           style={[styles.submit, { backgroundColor: colors.primary }]}
        >
          <Feather name="arrow-right" size={18} color={colors.primaryForeground} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginTop: spacing.lg, marginHorizontal: spacing.lg, zIndex: 2 },
  label: { fontSize: 10, fontWeight: '800', letterSpacing: 1.35, marginBottom: 9 },
  search: { minHeight: 64, borderRadius: radii.lg, borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingLeft: spacing.md, paddingRight: 8, paddingVertical: 7, ...elevation.floating },
  input: { flex: 1, marginLeft: spacing.sm, fontSize: 14, minHeight: 52 },
  submit: { width: 48, height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
