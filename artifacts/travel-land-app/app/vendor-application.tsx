import { PlatformIcon as Feather } from '@/components/PlatformIcon';
import { useColors } from '@/hooks/useColors';
import {
  useGetVendorApplicationStatus,
  useSubmitVendorApplication,
  type VendorApplicationInput,
  type VendorApplicationReceipt,
} from '@workspace/api-client-react';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const EMPTY_FORM: VendorApplicationInput = {
  businessName: '',
  businessType: '',
  contactName: '',
  phone: '',
  email: '',
  description: '',
  address: '',
  city: '',
  state: '',
  country: '',
};

function getErrorMessage(error: unknown) {
  const value = error as { message?: string; error?: { message?: string } } | null;
  return value?.error?.message || value?.message || 'We could not submit your application. Please try again.';
}

export default function VendorApplicationScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState('');
  const [receipt, setReceipt] = useState<VendorApplicationReceipt | null>(null);
  const mutation = useSubmitVendorApplication();
  const status = useGetVendorApplicationStatus(
    { id: receipt?.id ?? '', email: receipt?.email ?? '' },
    { query: { enabled: submitted && Boolean(receipt?.id && receipt?.email), queryKey: ['vendor-application-status', receipt?.id, receipt?.email] } },
  );

  const update = (key: keyof VendorApplicationInput, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setMessage('');
  };

  const submit = async () => {
    setMessage('');
    try {
      const result = await mutation.mutateAsync({ data: form });
      setReceipt(result);
      setSubmitted(true);
    } catch (error) {
      setMessage(getErrorMessage(error));
    }
  };

  if (submitted) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={[styles.successIcon, { backgroundColor: colors.secondary }]}>
          <Feather name="check" size={28} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>Application received.</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>An administrator will review your business details. If approved, you’ll receive a Clerk invitation to create your own account.</Text>
        {receipt && <Text style={[styles.reference, { color: colors.mutedForeground }]}>Application reference: {receipt.id}</Text>}
        {!!status.data && (
          <View style={[styles.statusCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statusLabel, { color: colors.primary }]}>{status.data.status.toUpperCase()}</Text>
            <Text style={[styles.statusMessage, { color: colors.foreground }]}>{status.data.message}</Text>
          </View>
        )}
        {status.isLoading && <ActivityIndicator color={colors.primary} style={styles.statusLoader} />}
        <Pressable onPress={() => router.replace('/login')} style={[styles.button, { backgroundColor: colors.primary }]}>
          <Text style={styles.buttonText}>Return to sign in</Text>
        </Pressable>
      </View>
    );
  }

  const fields: Array<{ key: keyof VendorApplicationInput; label: string; placeholder: string; multiline?: boolean }> = [
    { key: 'businessName', label: 'Business name', placeholder: 'e.g. Northern Trails Tours' },
    { key: 'businessType', label: 'Business type', placeholder: 'Hotel, tour operator, land agency…' },
    { key: 'contactName', label: 'Contact person', placeholder: 'Your full name' },
    { key: 'phone', label: 'Phone number', placeholder: '+91 …', },
    { key: 'email', label: 'Email address', placeholder: 'you@business.com' },
    { key: 'address', label: 'Business address', placeholder: 'Street and building' },
    { key: 'city', label: 'City', placeholder: 'City' },
    { key: 'state', label: 'State / region', placeholder: 'State or region' },
    { key: 'country', label: 'Country', placeholder: 'Country' },
    { key: 'description', label: 'Tell us about the business', placeholder: 'What do you offer travelers and land seekers?', multiline: true },
  ];
  const canSubmit = fields.every(({ key }) => form[key].trim().length > 0) && !mutation.isPending;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 }]}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable accessibilityRole="button" accessibilityLabel="Back to sign in" onPress={() => router.back()} style={styles.back}>
        <Feather name="arrow-left" size={20} color={colors.foreground} />
        <Text style={[styles.backText, { color: colors.foreground }]}>Sign in</Text>
      </Pressable>
      <Text style={[styles.kicker, { color: colors.primary }]}>VENDOR ONBOARDING</Text>
      <Text style={[styles.title, { color: colors.foreground }]}>Bring your business\nalong for the journey.</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        Apply before creating an account. Approved businesses receive a secure Clerk invitation by email.
      </Text>
      <View style={[styles.notice, { backgroundColor: colors.secondary }]}>
        <Feather name="shield" size={18} color={colors.primary} />
        <Text style={[styles.noticeText, { color: colors.secondaryForeground }]}>No password or credential is collected here.</Text>
      </View>
      {fields.map(({ key, label, placeholder, multiline }) => (
        <View key={key} style={styles.field}>
          <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
          <TextInput
            value={form[key]}
            onChangeText={(value) => update(key, value)}
            autoCapitalize={key === 'email' ? 'none' : 'sentences'}
            keyboardType={key === 'email' ? 'email-address' : key === 'phone' ? 'phone-pad' : 'default'}
            multiline={multiline}
            numberOfLines={multiline ? 5 : 1}
            placeholder={placeholder}
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, multiline && styles.textarea, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.card }]}
          />
        </View>
      ))}
      {!!message && <Text style={[styles.error, { color: colors.destructive }]}>{message}</Text>}
      <Pressable accessibilityRole="button" disabled={!canSubmit} onPress={submit} style={[styles.button, { backgroundColor: canSubmit ? colors.primary : colors.muted }]}>
        {mutation.isPending ? <ActivityIndicator color="#fff" /> : <><Text style={styles.buttonText}>Submit application</Text><Feather name="arrow-right" size={17} color="#fff" /></>}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20 },
  centered: { flex: 1, paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center' },
  back: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 28 },
  backText: { fontSize: 14, fontWeight: '700' },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.8 },
  subtitle: { fontSize: 15, lineHeight: 22, marginTop: 12, marginBottom: 20 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, padding: 13, marginBottom: 22 },
  noticeText: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: '600' },
  field: { marginBottom: 15 },
  label: { fontSize: 12, fontWeight: '700', marginBottom: 7 },
  input: { minHeight: 52, borderWidth: 1, borderRadius: 14, paddingHorizontal: 15, fontSize: 15 },
  textarea: { minHeight: 120, paddingTop: 14, textAlignVertical: 'top' },
  error: { fontSize: 13, lineHeight: 18, marginBottom: 12 },
  button: { minHeight: 56, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  successIcon: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
  reference: { fontSize: 11, textAlign: 'center', marginBottom: 18 },
  statusCard: { width: '100%', borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 18 },
  statusLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  statusMessage: { fontSize: 14, lineHeight: 20, marginTop: 7 },
  statusLoader: { marginBottom: 18 },
});