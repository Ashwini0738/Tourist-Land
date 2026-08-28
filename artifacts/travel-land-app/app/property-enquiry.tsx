import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

export default function PropertyEnquiryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { property = 'this property' } = useLocalSearchParams<{ property?: string }>();
  const [message, setMessage] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);
  if (submitted) {
    return <View style={[styles.confirm, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}><View style={[styles.confirmIcon, { backgroundColor: colors.secondary }]}><Feather name="check" size={29} color={colors.primary} /></View><Text style={[styles.confirmTitle, { color: colors.foreground }]}>Enquiry sent.</Text><Text style={[styles.confirmText, { color: colors.mutedForeground }]}>The owner or sourcing agent for {property} will contact you after reviewing your request.</Text><Pressable onPress={() => router.replace('/land')} style={[styles.button, { backgroundColor: colors.primary }]}><Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Back to Land</Text></Pressable></View>;
  }
  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 30 }]} keyboardShouldPersistTaps="handled"><Pressable onPress={() => router.back()}><Feather name="arrow-left" size={21} color={colors.foreground} /></Pressable><Text style={[styles.kicker, { color: colors.primary }]}>PROPERTY ENQUIRY</Text><Text style={[styles.title, { color: colors.foreground }]}>Start a conversation.</Text><Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Ask about {property}, request documents, or arrange a site visit.</Text><TextInput placeholder="Your name" placeholderTextColor={colors.mutedForeground} style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]} /><TextInput placeholder="Email or mobile number" placeholderTextColor={colors.mutedForeground} style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]} /><TextInput value={message} onChangeText={setMessage} placeholder="What would you like to know?" placeholderTextColor={colors.mutedForeground} multiline style={[styles.message, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]} /><View style={[styles.contact, { backgroundColor: colors.secondary }]}><Feather name="phone" size={17} color={colors.primary} /><Text style={[styles.contactText, { color: colors.foreground }]}>Preferred contact: phone or email</Text></View><Pressable onPress={() => setSubmitted(true)} style={[styles.button, { backgroundColor: colors.primary }]}><Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Send enquiry</Text><Feather name="arrow-right" size={17} color={colors.primaryForeground} /></Pressable></ScrollView>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20 },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginTop: 33, marginBottom: 8 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.8 },
  subtitle: { fontSize: 14, lineHeight: 21, marginTop: 10, marginBottom: 25 },
  input: { height: 53, borderWidth: 1, borderRadius: 15, paddingHorizontal: 15, fontSize: 14, marginBottom: 10 },
  message: { minHeight: 120, borderWidth: 1, borderRadius: 15, padding: 15, fontSize: 14, textAlignVertical: 'top' },
  contact: { borderRadius: 14, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 12 },
  contactText: { fontSize: 12, fontWeight: '600' },
  button: { minWidth: 210, height: 54, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 16 },
  buttonText: { fontSize: 14, fontWeight: '700' },
  confirm: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 25 },
  confirmIcon: { width: 66, height: 66, borderRadius: 33, alignItems: 'center', justifyContent: 'center' },
  confirmTitle: { fontSize: 29, fontWeight: '700', marginTop: 22 },
  confirmText: { fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 9 },
});