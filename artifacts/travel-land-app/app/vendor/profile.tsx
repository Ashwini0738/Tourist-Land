import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { getGetVendorProfileQueryKey, useGetVendorProfile, useUpdateVendorProfile, type VendorProfile } from '@workspace/api-client-react';
import { Button, Field, Panel, State, VendorPage, errorText } from '@/features/vendor/VendorUI';
import { useRole } from '@/context/RoleContext';
import { useColors } from '@/hooks/useColors';

export default function VendorProfileScreen() {
  const colors = useColors();
  const { currentUser } = useRole();
  const profileQuery = useGetVendorProfile({
    query: {
      enabled: Boolean(currentUser),
      retry: false,
      queryKey: [...getGetVendorProfileQueryKey(), currentUser?.id ?? 'signed-out'],
    },
  });
  const update = useUpdateVendorProfile();
  const profile = profileQuery.data ?? currentUser?.vendorProfile;
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({ businessName: '', contactName: '', phone: '', email: '', description: '', address: '', city: '', state: '', country: '' });
  const beginEdit = () => {
    if (!profile) return;
    setForm({
      businessName: profile.businessName, contactName: profile.contactName, phone: profile.phone, email: profile.email, description: profile.description,
      address: profile.address, city: profile.city, state: profile.state, country: profile.country,
    });
    setEditing(true); setNotice(''); setError('');
  };
  const save = async () => {
    try {
      await update.mutateAsync({ data: form });
      setEditing(false); setNotice('Business profile updated.'); await profileQuery.refetch();
    } catch (caught) { setError(errorText(caught, 'The business profile could not be updated.')); }
  };
  if (profileQuery.isLoading && !profile) return <VendorPage title="Your business profile." eyebrow="VENDOR PROFILE"><State title="Loading profile…" description="Fetching your approved vendor details." /></VendorPage>;
  if (!profile) return <VendorPage title="Your business profile." eyebrow="VENDOR PROFILE"><State title="Profile unavailable" description="We could not load your vendor profile." retry={() => profileQuery.refetch()} /></VendorPage>;
  return <VendorPage title="Your business profile." eyebrow="VENDOR PROFILE">
    <Text style={[styles.intro, { color: colors.mutedForeground }]}>Keep your contact and business details current. Approval status cannot be changed here.</Text>
    {!!notice && <Text style={[styles.notice, { color: colors.primary }]}>{notice}</Text>}
    {!!error && <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>}
    {!editing ? <Panel>
      <Text style={[styles.business, { color: colors.foreground }]}>{profile.businessName}</Text>
      <Text style={[styles.muted, { color: colors.mutedForeground }]}>{profile.businessType} · {profile.status}</Text>
      <Text style={[styles.muted, { color: colors.mutedForeground }]}>{profile.contactName} · {profile.email}</Text>
      <Text style={[styles.muted, { color: colors.mutedForeground }]}>{profile.phone}</Text>
      <Text style={[styles.muted, { color: colors.mutedForeground }]}>{[profile.address, profile.city, profile.state, profile.country].filter(Boolean).join(', ')}</Text>
      <Text style={[styles.description, { color: colors.foreground }]}>{profile.description}</Text>
      <Button label="Edit business profile" onPress={beginEdit} />
    </Panel> : <Panel>
      <Field label="Business name" value={form.businessName} onChangeText={(v) => setForm((current) => ({ ...current, businessName: v }))} placeholder="Business name" />
      <Field label="Contact name" value={form.contactName} onChangeText={(v) => setForm((current) => ({ ...current, contactName: v }))} placeholder="Primary contact" />
      <Field label="Email" value={form.email} onChangeText={(v) => setForm((current) => ({ ...current, email: v }))} placeholder="business@example.com" keyboardType="email-address" />
      <Field label="Phone" value={form.phone} onChangeText={(v) => setForm((current) => ({ ...current, phone: v }))} placeholder="+91…" keyboardType="numeric" />
      <Field label="Address" value={form.address} onChangeText={(v) => setForm((current) => ({ ...current, address: v }))} placeholder="Business address" />
      <Field label="City" value={form.city} onChangeText={(v) => setForm((current) => ({ ...current, city: v }))} placeholder="City" />
      <Field label="State" value={form.state} onChangeText={(v) => setForm((current) => ({ ...current, state: v }))} placeholder="State" />
      <Field label="Country" value={form.country} onChangeText={(v) => setForm((current) => ({ ...current, country: v }))} placeholder="Country" />
      <Field label="Description" value={form.description} onChangeText={(v) => setForm((current) => ({ ...current, description: v }))} placeholder="About your business" multiline />
      <Button label={update.isPending ? 'Saving…' : 'Save profile'} onPress={save} disabled={update.isPending} />
    </Panel>}
  </VendorPage>;
}

const styles = StyleSheet.create({
  intro: { fontSize: 14, lineHeight: 21, marginBottom: 16 },
  notice: { fontSize: 13, marginBottom: 12 },
  error: { fontSize: 13, lineHeight: 19, marginBottom: 12 },
  business: { fontSize: 18, fontWeight: '700' },
  muted: { fontSize: 13, lineHeight: 19, marginTop: 6 },
  description: { fontSize: 14, lineHeight: 21, marginVertical: 16 },
});
