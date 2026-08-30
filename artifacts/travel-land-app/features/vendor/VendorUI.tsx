import { PlatformIcon } from '@/components/PlatformIcon';
import { useColors } from '@/hooks/useColors';
import { router } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function VendorPage({ title, eyebrow, children }: { title: string; eyebrow?: string; children: React.ReactNode }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.page, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 36 }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to vendor dashboard" onPress={() => router.replace('/vendor')} style={styles.back}>
        <PlatformIcon name="arrow-left" size={18} color={colors.foreground} />
        <Text style={[styles.backText, { color: colors.foreground }]}>Vendor dashboard</Text>
      </Pressable>
      <Text style={[styles.eyebrow, { color: colors.primary }]}>{eyebrow ?? 'VENDOR OPERATIONS'}</Text>
      <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
      {children}
    </ScrollView>
  );
}

export function Panel({ children, style }: { children: React.ReactNode; style?: object }) {
  const colors = useColors();
  return <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }, style]}>{children}</View>;
}

export function Field({ label, value, onChangeText, placeholder, multiline = false, keyboardType = 'default' }: {
  label: string; value: string; onChangeText: (value: string) => void; placeholder: string; multiline?: boolean; keyboardType?: 'default' | 'numeric' | 'email-address';
}) {
  const colors = useColors();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        keyboardType={keyboardType}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[styles.input, multiline && styles.textarea, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.input }]}
      />
    </View>
  );
}

export function Button({ label, onPress, secondary = false, disabled = false }: { label: string; onPress: () => void; secondary?: boolean; disabled?: boolean }) {
  const colors = useColors();
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.button, { backgroundColor: disabled ? colors.muted : secondary ? colors.secondary : colors.primary, borderColor: colors.border }]}>
      {disabled && <ActivityIndicator size="small" color={secondary ? colors.foreground : colors.primaryForeground} />}
      <Text style={[styles.buttonText, { color: secondary ? colors.foreground : colors.primaryForeground }]}>{label}</Text>
    </Pressable>
  );
}

export function State({ title, description, retry }: { title: string; description: string; retry?: () => void }) {
  const colors = useColors();
  return (
    <Panel style={styles.state}>
      <PlatformIcon name="alert-circle" size={24} color={colors.primary} />
      <Text style={[styles.stateTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.stateText, { color: colors.mutedForeground }]}>{description}</Text>
      {retry && <Button label="Try again" onPress={retry} secondary />}
    </Panel>
  );
}

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'good' | 'warn' | 'bad' }) {
  const colors = useColors();
  const background = tone === 'good' ? colors.secondary : tone === 'warn' ? `${colors.accent}45` : tone === 'bad' ? `${colors.destructive}16` : colors.muted;
  const foreground = tone === 'good' ? colors.primary : tone === 'warn' ? colors.accentForeground : tone === 'bad' ? colors.destructive : colors.mutedForeground;
  return <View style={[styles.badge, { backgroundColor: background }]}><Text style={[styles.badgeText, { color: foreground }]}>{label}</Text></View>;
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  return <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{children}</Text>;
}

export function errorText(error: unknown, fallback: string) {
  const value = error as { message?: string; error?: { message?: string } } | null;
  return value?.error?.message || value?.message || fallback;
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 20, maxWidth: 960, width: '100%', alignSelf: 'center' },
  back: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 28 },
  backText: { fontSize: 14, fontWeight: '700' },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4, marginBottom: 8 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.6, marginBottom: 24 },
  panel: { borderWidth: 1, borderRadius: 20, padding: 16, marginBottom: 16 },
  field: { marginBottom: 13 },
  label: { fontSize: 12, fontWeight: '700', marginBottom: 7 },
  input: { minHeight: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, fontSize: 14 },
  textarea: { minHeight: 90, paddingTop: 12 },
  button: { minHeight: 44, borderRadius: 12, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1 },
  buttonText: { fontSize: 13, fontWeight: '700' },
  state: { alignItems: 'center', paddingVertical: 28 },
  stateTitle: { fontSize: 16, fontWeight: '700', marginTop: 10 },
  stateText: { textAlign: 'center', fontSize: 13, lineHeight: 19, marginTop: 7, marginBottom: 14 },
  badge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  sectionTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginBottom: 10, marginTop: 10 },
});