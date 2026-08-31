import { PlatformIcon as Feather } from '@/components/PlatformIcon';
import { useColors } from '@/hooks/useColors';
import { createPropertyEnquiry } from '@workspace/api-client-react';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function errorMessage(error: unknown) {
  return error instanceof Error && error.message
    ? error.message
    : 'Your enquiry could not be sent. Nothing was submitted; please try again.';
}

export default function PropertyEnquiryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ property?: string | string[]; propertyId?: string | string[] }>();
  const property = firstParam(params.property) ?? 'this property';
  const propertyId = firstParam(params.propertyId) ?? '';
  const [message, setMessage] = React.useState('');
  const [preferredContactMethod, setPreferredContactMethod] = React.useState<'email' | 'phone'>('email');
  const [submitted, setSubmitted] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const idempotencyKey = React.useRef(`property-enquiry-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);

  const submit = async () => {
    const trimmedMessage = message.trim();
    if (!propertyId) {
      setError('This property link is incomplete. Return to Land and open the property again.');
      return;
    }
    if (trimmedMessage.length < 10) {
      setError('Tell the owner what you would like to know in at least 10 characters.');
      return;
    }
    if (trimmedMessage.length > 2000) {
      setError('Keep your enquiry under 2,000 characters.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await createPropertyEnquiry(
        propertyId,
        { message: trimmedMessage, preferredContactMethod },
        { headers: { 'Idempotency-Key': idempotencyKey.current } },
      );
      setSubmitted(true);
    } catch (submissionError) {
      setError(errorMessage(submissionError));
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <View style={[styles.confirm, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={[styles.confirmIcon, { backgroundColor: colors.secondary }]}>
          <Feather name="check" size={29} color={colors.primary} />
        </View>
        <Text style={[styles.confirmTitle, { color: colors.foreground }]}>Enquiry recorded.</Text>
        <Text style={[styles.confirmText, { color: colors.mutedForeground }]}>
          Your request about {property} was saved. The property owner can review it from their protected workspace.
        </Text>
        <Pressable accessibilityRole="button" onPress={() => router.replace('/property-enquiries')} style={[styles.button, { backgroundColor: colors.primary }]}>
          <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Track my enquiries</Text>
          <Feather name="arrow-right" size={17} color={colors.primaryForeground} />
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.replace('/(tabs)/land')} style={[styles.secondaryButton, { borderColor: colors.border }]}>
          <Text style={[styles.buttonText, { color: colors.primary }]}>Back to Land</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 30 }]} keyboardShouldPersistTaps="handled">
      <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()}>
        <Feather name="arrow-left" size={21} color={colors.foreground} />
      </Pressable>
      <Text style={[styles.kicker, { color: colors.primary }]}>PROPERTY ENQUIRY</Text>
      <Text style={[styles.title, { color: colors.foreground }]}>Start a conversation.</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Ask about {property}, request documents, or arrange a site visit.</Text>
      <Text style={[styles.fieldLabel, { color: colors.foreground }]}>What would you like to know?</Text>
      <TextInput
        testID="property-enquiry-message"
        value={message}
        onChangeText={(value) => { setMessage(value); setError(null); }}
        placeholder="Include the documents, dates, or questions you want the owner to review."
        placeholderTextColor={colors.mutedForeground}
        multiline
        maxLength={2000}
        style={[styles.message, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
      />
      <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Preferred contact</Text>
      <View style={styles.contactOptions}>
        {(['email', 'phone'] as const).map((method) => (
          <Pressable
            key={method}
            testID={`property-enquiry-contact-${method}`}
            accessibilityRole="radio"
            accessibilityState={{ checked: preferredContactMethod === method }}
            onPress={() => setPreferredContactMethod(method)}
            style={[styles.contactOption, { borderColor: preferredContactMethod === method ? colors.primary : colors.border, backgroundColor: preferredContactMethod === method ? colors.secondary : colors.card }]}
          >
            <Feather name={method === 'email' ? 'mail' : 'phone'} size={17} color={colors.primary} />
            <Text style={[styles.contactText, { color: colors.foreground }]}>{method === 'email' ? 'Email' : 'Phone'}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={[styles.help, { color: colors.mutedForeground }]}>Your verified account contact details are used; they are not accepted from this form.</Text>
      {error ? <Text testID="property-enquiry-error" accessibilityRole="alert" style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
      <Pressable testID="property-enquiry-submit" accessibilityRole="button" disabled={submitting} onPress={() => void submit()} style={[styles.button, { backgroundColor: submitting ? colors.muted : colors.primary }]}>
        {submitting ? <ActivityIndicator color={colors.primaryForeground} /> : <>
          <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Send enquiry</Text>
          <Feather name="arrow-right" size={17} color={colors.primaryForeground} />
        </>}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20 },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginTop: 33, marginBottom: 8 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.8 },
  subtitle: { fontSize: 14, lineHeight: 21, marginTop: 10, marginBottom: 25 },
  fieldLabel: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  message: { minHeight: 140, borderWidth: 1, borderRadius: 15, padding: 15, fontSize: 14, textAlignVertical: 'top', marginBottom: 18 },
  contactOptions: { flexDirection: 'row', gap: 10 },
  contactOption: { minHeight: 48, flex: 1, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 9 },
  contactText: { fontSize: 13, fontWeight: '700' },
  help: { fontSize: 11, lineHeight: 16, marginTop: 9 },
  error: { fontSize: 12, lineHeight: 18, marginTop: 14, fontWeight: '600' },
  button: { minWidth: 210, minHeight: 54, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 16, paddingHorizontal: 18 },
  buttonText: { fontSize: 14, fontWeight: '700' },
  secondaryButton: { minWidth: 210, minHeight: 52, borderWidth: 1, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10, paddingHorizontal: 18 },
  confirm: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 25 },
  confirmIcon: { width: 66, height: 66, borderRadius: 33, alignItems: 'center', justifyContent: 'center' },
  confirmTitle: { fontSize: 29, fontWeight: '700', marginTop: 22 },
  confirmText: { fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 9 },
});