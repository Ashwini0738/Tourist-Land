import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Keyboard, Pressable, StyleSheet, Text, TextInput, TouchableWithoutFeedback, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [value, setValue] = React.useState('');
  return <TouchableWithoutFeedback onPress={Keyboard.dismiss}><View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 18, paddingBottom: insets.bottom + 12 }]}><Pressable onPress={() => router.replace('/splash')}><Feather name="arrow-left" size={21} color={colors.foreground} /></Pressable><View style={styles.copy}><Text style={[styles.kicker, { color: colors.primary }]}>WELCOME IN</Text><Text style={[styles.title, { color: colors.foreground }]}>Your next chapter{'\n'}starts here.</Text><Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Sign in to keep your stays, bookings, and saved places together.</Text><View style={[styles.inputWrap, { borderColor: colors.input, backgroundColor: colors.card }]}><Feather name="mail" size={18} color={colors.mutedForeground} /><TextInput testID="login-input" value={value} onChangeText={setValue} autoCapitalize="none" placeholder="Email or mobile number" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground }]} /></View><Pressable testID="login-continue" onPress={() => router.push('/verify')} style={[styles.button, { backgroundColor: colors.primary }]}><Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Continue</Text><Feather name="arrow-right" size={17} color={colors.primaryForeground} /></Pressable><Pressable onPress={() => router.push('/pin-login')} style={styles.secondary}><Text style={[styles.secondaryText, { color: colors.primary }]}>I already have a PIN</Text></Pressable></View><Pressable onPress={() => router.replace('/(tabs)')} style={styles.guest}><Text style={[styles.guestText, { color: colors.mutedForeground }]}>Explore as a guest</Text></Pressable></View></TouchableWithoutFeedback>;
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 22 },
  copy: { marginTop: 90 },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 9 },
  title: { fontSize: 31, lineHeight: 37, fontWeight: '700', letterSpacing: -0.8 },
  subtitle: { fontSize: 14, lineHeight: 21, marginTop: 12, maxWidth: 310 },
  inputWrap: { height: 56, borderWidth: 1, borderRadius: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, marginTop: 29 },
  input: { flex: 1, fontSize: 14, marginLeft: 11 },
  button: { height: 54, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 13 },
  buttonText: { fontSize: 14, fontWeight: '700' },
  secondary: { alignItems: 'center', marginTop: 18 },
  secondaryText: { fontSize: 13, fontWeight: '700' },
  guest: { alignItems: 'center', padding: 16 },
  guestText: { fontSize: 13, fontWeight: '600' },
});