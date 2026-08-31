import { PlatformIcon as Feather } from '@/components/PlatformIcon';
import { useColors } from '@/hooks/useColors';
import { useInviteAdmin, useListAdminInvitations, useListAdminUsersPage } from '@workspace/api-client-react';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AdminUsersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const users = useListAdminUsersPage();
  const invitations = useListAdminInvitations();
  const invite = useInviteAdmin();

  const submit = async () => {
    setMessage('');
    try {
      await invite.mutateAsync({ data: { email: email.trim() } });
      setEmail('');
      setMessage('Invitation sent. The recipient creates their own Clerk credentials.');
      await invitations.refetch();
    } catch (error) {
      const value = error as { message?: string; error?: { message?: string } } | null;
      setMessage(value?.error?.message || value?.message || 'The invitation could not be sent.');
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}
      refreshControl={<RefreshControl refreshing={users.isFetching} onRefresh={() => { users.refetch(); invitations.refetch(); }} tintColor={colors.primary} />}
    >
      <Pressable accessibilityRole="button" accessibilityLabel="Back to admin dashboard" onPress={() => router.replace('/admin')} style={styles.back}>
        <Feather name="arrow-left" size={20} color={colors.foreground} />
        <Text style={[styles.backText, { color: colors.foreground }]}>Dashboard</Text>
      </Pressable>
      <Text style={[styles.kicker, { color: colors.primary }]}>ACCESS CONTROL</Text>
      <Text style={[styles.title, { color: colors.foreground }]}>People with a key\nto the platform.</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        Invite administrators without handling or sharing passwords. Role access is assigned after their Clerk account is created.
      </Text>
      <View style={[styles.inviteCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Invite an administrator</Text>
        <TextInput value={email} onChangeText={(value) => { setEmail(value); setMessage(''); }} autoCapitalize="none" keyboardType="email-address" placeholder="admin@business.com" placeholderTextColor={colors.mutedForeground} style={[styles.input, { backgroundColor: colors.background, borderColor: colors.input, color: colors.foreground }]} />
        {!!message && <Text style={[styles.message, { color: message.startsWith('Invitation sent') ? colors.primary : colors.destructive }]}>{message}</Text>}
        <Pressable disabled={!email.trim() || invite.isPending} onPress={submit} style={[styles.button, { backgroundColor: email.trim() && !invite.isPending ? colors.primary : colors.muted }]}>
          {invite.isPending ? <ActivityIndicator color="#fff" /> : <><Text style={styles.buttonText}>Send secure invite</Text><Feather name="send" size={16} color="#fff" /></>}
        </Pressable>
      </View>
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>INVITATIONS</Text>
      {invitations.data?.items.filter((item) => item.status === 'sent').map((item) => (
        <View key={item.id} style={[styles.row, { borderBottomColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.secondary }]}><Feather name="mail" size={16} color={colors.primary} /></View>
          <View style={styles.rowCopy}><Text style={[styles.rowTitle, { color: colors.foreground }]}>{item.email}</Text><Text style={[styles.rowMeta, { color: colors.mutedForeground }]}>Admin invite · awaiting account creation</Text></View>
        </View>
      ))}
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>LOCAL ACCOUNTS</Text>
      {users.data?.items.map((user) => (
        <View key={user.id} style={[styles.row, { borderBottomColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.secondary }]}><Feather name={user.role === 'admin' ? 'shield' : user.role === 'vendor' ? 'briefcase' : 'user'} size={16} color={colors.primary} /></View>
          <View style={styles.rowCopy}><Text style={[styles.rowTitle, { color: colors.foreground }]}>{user.displayName || user.email}</Text><Text style={[styles.rowMeta, { color: colors.mutedForeground }]}>{user.email} · {user.role.toUpperCase()}</Text></View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 28 },
  backText: { fontSize: 14, fontWeight: '700' },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.8 },
  subtitle: { fontSize: 15, lineHeight: 22, marginTop: 12, marginBottom: 24 },
  inviteCard: { borderWidth: 1, borderRadius: 20, padding: 16, marginBottom: 28 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  input: { minHeight: 52, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, fontSize: 15 },
  message: { fontSize: 12, lineHeight: 17, marginTop: 10 },
  button: { minHeight: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9, marginTop: 14 },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.3, marginBottom: 10 },
  row: { minHeight: 68, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  rowCopy: { flex: 1, marginLeft: 12 },
  rowTitle: { fontSize: 14, fontWeight: '700' },
  rowMeta: { fontSize: 11, marginTop: 4 },
});
