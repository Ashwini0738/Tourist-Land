import { useAuth as useClerkAuth } from '@clerk/expo';
import { completeIdentityLink, startIdentityLink } from '@workspace/api-client-react';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PlatformIcon as Feather } from '@/components/PlatformIcon';
import { useMobileAuth } from '@/context/AuthContext';
import { useRole } from '@/context/RoleContext';
import { useColors } from '@/hooks/useColors';
import { radii, spacing } from '@/constants/theme';

function messageFor(error: unknown): string {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = (error as { data?: { error?: { message?: unknown } } }).data;
    if (typeof data?.error?.message === 'string') return data.error.message;
  }
  return error instanceof Error ? error.message : 'Email sign-in could not be linked.';
}

export default function IdentityLinkScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const clerkAuth = useClerkAuth();
  const { signInForIdentityLink, finishIdentityLinking, cancelIdentityLinking } = useMobileAuth();
  const { refetch } = useRole();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function link(): Promise<void> {
    if (!email.trim() || !password) return;
    setLoading(true);
    setMessage('');
    try {
      const clerkToken = await clerkAuth.getToken();
      if (!clerkAuth.isSignedIn || !clerkToken) {
        throw new Error('Your Clerk session is no longer available. Sign in again to continue.');
      }
      const attempt = await startIdentityLink({
        headers: { authorization: `Bearer ${clerkToken}` },
      });
      const supabaseToken = await signInForIdentityLink(email.trim(), password);
      await completeIdentityLink(attempt.attemptId, {
        headers: {
          authorization: `Bearer ${clerkToken}`,
          'x-supabase-link-token': supabaseToken,
        },
      });
      finishIdentityLinking();
      await refetch();
      router.replace('/(tabs)/profile');
    } catch (error) {
      setMessage(messageFor(error));
    } finally {
      setLoading(false);
    }
  }

  async function cancel(): Promise<void> {
    try {
      await cancelIdentityLinking();
    } finally {
      router.back();
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top + 12 }]}>
      <Pressable accessibilityRole="button" disabled={loading} onPress={() => void cancel()}>
        <Feather name="arrow-left" size={22} color={colors.foreground} />
      </Pressable>
      <View style={styles.body}>
        <Text style={[styles.kicker, { color: colors.primary }]}>ACCOUNT SECURITY</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>Add email sign-in.</Text>
        <Text style={[styles.copy, { color: colors.mutedForeground }]}>
          Sign in to your Supabase email account once. Travel & Land will link it to this verified
          Clerk account without changing your bookings, roles, or profile.
        </Text>
        <TextInput
          testID="identity-link-email"
          value={email}
          onChangeText={(value) => { setEmail(value); setMessage(''); }}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="Email address"
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
        />
        <TextInput
          testID="identity-link-password"
          value={password}
          onChangeText={(value) => { setPassword(value); setMessage(''); }}
          autoCapitalize="none"
          autoComplete="current-password"
          secureTextEntry
          placeholder="Password"
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
        />
        {message ? <Text style={[styles.error, { color: colors.destructive }]}>{message}</Text> : null}
        <Pressable
          testID="identity-link-submit"
          disabled={loading || !email.trim() || !password}
          onPress={() => void link()}
          style={[styles.button, { backgroundColor: loading || !email.trim() || !password ? colors.muted : colors.primary }]}
        >
          {loading
            ? <ActivityIndicator color={colors.primaryForeground} />
            : <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Link email sign-in</Text>}
        </Pressable>
        <Text style={[styles.note, { color: colors.mutedForeground }]}>
          Your password and access tokens are never stored by the Travel & Land API.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: spacing.lg },
  body: { flex: 1, justifyContent: 'center', paddingBottom: 72 },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4, marginBottom: 10 },
  title: { fontSize: 32, lineHeight: 38, fontWeight: '700', letterSpacing: -0.8 },
  copy: { fontSize: 14, lineHeight: 21, marginTop: 12, marginBottom: 24 },
  input: { minHeight: 52, borderWidth: 1, borderRadius: radii.md, paddingHorizontal: 14, marginBottom: 12 },
  button: { minHeight: 52, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  buttonText: { fontSize: 14, fontWeight: '700' },
  error: { fontSize: 13, lineHeight: 19, marginTop: 2 },
  note: { fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 16 },
});