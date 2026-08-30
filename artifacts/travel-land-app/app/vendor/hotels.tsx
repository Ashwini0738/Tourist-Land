import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  useArchiveVendorHotel,
  useCreateVendorHotel,
  useListVendorHotels,
  useSubmitVendorHotel,
  useUpdateVendorHotel,
  type VendorHotel,
  type VendorHotelInput,
} from '@workspace/api-client-react';
import { Badge, Button, Field, Panel, SectionTitle, State, VendorPage, errorText } from '@/features/vendor/VendorUI';
import { useColors } from '@/hooks/useColors';

const EMPTY: VendorHotelInput = {
  name: '', description: '', propertyType: 'hotel', address: '', city: null, state: null, country: null, postalCode: null,
  latitude: null, longitude: null, contactPhone: null, contactEmail: null, website: null, amenities: [], imageUrls: [], checkInTime: null, checkOutTime: null,
};

export default function VendorHotelsScreen() {
  const colors = useColors();
  const query = useListVendorHotels({ page: 1, limit: 50 });
  const create = useCreateVendorHotel();
  const update = useUpdateVendorHotel();
  const submit = useSubmitVendorHotel();
  const archive = useArchiveVendorHotel();
  const [form, setForm] = useState<VendorHotelInput>(EMPTY);
  const [editing, setEditing] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const items = query.data?.items ?? [];

  const set = (key: keyof VendorHotelInput, value: string) => setForm((current) => ({ ...current, [key]: value || null }));
  const open = (hotel?: VendorHotel) => {
    setEditing(hotel?.id ?? null);
    setForm(hotel ? {
      name: hotel.name, description: hotel.description, propertyType: hotel.propertyType, address: hotel.address, city: hotel.city, state: hotel.state,
      country: hotel.country, postalCode: hotel.postalCode, latitude: hotel.latitude, longitude: hotel.longitude, contactPhone: hotel.contactPhone,
      contactEmail: hotel.contactEmail, website: hotel.website, amenities: hotel.amenities, imageUrls: hotel.imageUrls, checkInTime: hotel.checkInTime, checkOutTime: hotel.checkOutTime,
    } : EMPTY);
    setFormOpen(true); setError(''); setNotice('');
  };
  const save = async () => {
    if (!form.name.trim() || !form.address.trim()) { setError('Hotel name and address are required.'); return; }
    setError(''); setNotice('');
    try {
      if (editing) await update.mutateAsync({ id: editing, data: form });
      else await create.mutateAsync({ data: { ...form, name: form.name.trim(), address: form.address.trim() } });
      setFormOpen(false); setNotice(editing ? 'Hotel details saved.' : 'Draft hotel created. Submit it when the details are ready.');
      await query.refetch();
    } catch (caught) { setError(errorText(caught, 'The hotel could not be saved.')); }
  };
  const doSubmit = async (hotel: VendorHotel) => {
    try { await submit.mutateAsync({ id: hotel.id }); setNotice(`${hotel.name} was sent for approval.`); await query.refetch(); }
    catch (caught) { setError(errorText(caught, 'The hotel could not be submitted.')); }
  };
  const doArchive = (hotel: VendorHotel) => Alert.alert('Archive hotel?', 'Existing booking history is retained, but this hotel will stop being offered.', [
    { text: 'Keep hotel', style: 'cancel' },
    { text: 'Archive', style: 'destructive', onPress: async () => {
      try { await archive.mutateAsync({ id: hotel.id }); setNotice(`${hotel.name} was archived.`); await query.refetch(); }
      catch (caught) { setError(errorText(caught, 'The hotel could not be archived.')); }
    } },
  ]);

  return (
    <VendorPage title="Hotels you operate." eyebrow="HOTEL MANAGEMENT">
      <Text style={[styles.intro, { color: colors.mutedForeground }]}>Keep property details accurate. Approval status is controlled by the platform.</Text>
      {!!notice && <Text style={[styles.notice, { color: colors.primary }]}>{notice}</Text>}
      {!!error && <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>}
      <Button label={formOpen ? 'Close hotel form' : 'Add hotel'} onPress={() => formOpen ? setFormOpen(false) : open()} />
      {formOpen && (
        <Panel style={styles.form}>
          <Text style={[styles.formTitle, { color: colors.foreground }]}>{editing ? 'Edit hotel' : 'New hotel draft'}</Text>
          <Field label="Hotel name" value={form.name} onChangeText={(v) => set('name', v)} placeholder="e.g. Cedar House Retreat" />
          <Field label="Address" value={form.address} onChangeText={(v) => set('address', v)} placeholder="Street and locality" />
          <Field label="City" value={form.city ?? ''} onChangeText={(v) => set('city', v)} placeholder="City" />
          <Field label="Country" value={form.country ?? ''} onChangeText={(v) => set('country', v)} placeholder="Country" />
          <Field label="Property type" value={form.propertyType ?? ''} onChangeText={(v) => set('propertyType', v)} placeholder="Hotel, resort, homestay…" />
          <Field label="Description" value={form.description ?? ''} onChangeText={(v) => set('description', v)} placeholder="What should guests know?" multiline />
          <Field label="Contact email" value={form.contactEmail ?? ''} onChangeText={(v) => set('contactEmail', v)} placeholder="operations@example.com" keyboardType="email-address" />
          <Field label="Contact phone" value={form.contactPhone ?? ''} onChangeText={(v) => set('contactPhone', v)} placeholder="+91…" keyboardType="numeric" />
          {!!error && <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>}
          <Button label={create.isPending || update.isPending ? 'Saving…' : 'Save hotel'} onPress={save} disabled={create.isPending || update.isPending} />
        </Panel>
      )}
      <SectionTitle>YOUR HOTELS · {items.length}</SectionTitle>
      {query.isLoading ? <State title="Loading hotels…" description="Fetching your owned properties." /> :
        query.isError ? <State title="Hotels unavailable" description="We could not load your hotel workspace." retry={() => query.refetch()} /> :
        items.length === 0 ? <State title="No hotels yet" description="Create a draft hotel to begin your accommodation catalogue." /> :
        items.map((hotel) => (
          <Panel key={hotel.id}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>{hotel.name}</Text>
                <Text style={[styles.muted, { color: colors.mutedForeground }]}>{[hotel.city, hotel.country].filter(Boolean).join(', ') || hotel.address}</Text>
              </View>
              <Badge label={hotel.approvalStatus === 'approved' ? hotel.status : hotel.approvalStatus === 'pending' ? 'Awaiting review' : 'Rejected'} tone={hotel.approvalStatus === 'approved' ? 'good' : hotel.approvalStatus === 'rejected' ? 'bad' : 'warn'} />
            </View>
            <Text style={[styles.muted, { color: colors.mutedForeground }]}>{hotel.description || 'No description added yet.'}</Text>
            <View style={styles.actions}>
              <Button label="Edit" onPress={() => open(hotel)} secondary />
              {hotel.status === 'draft' && hotel.approvalStatus !== 'approved' && <Button label="Submit" onPress={() => doSubmit(hotel)} disabled={submit.isPending} />}
              {hotel.status !== 'archived' && <Pressable onPress={() => doArchive(hotel)}><Text style={[styles.archive, { color: colors.destructive }]}>Archive</Text></Pressable>}
            </View>
          </Panel>
        ))}
    </VendorPage>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 14, lineHeight: 21, marginBottom: 16 },
  notice: { fontSize: 13, lineHeight: 19, marginBottom: 12 },
  error: { fontSize: 13, lineHeight: 19, marginBottom: 12 },
  form: { marginTop: 16 },
  formTitle: { fontSize: 18, fontWeight: '700', marginBottom: 14 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  muted: { fontSize: 13, lineHeight: 19, marginTop: 6 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 15, flexWrap: 'wrap' },
  archive: { fontSize: 13, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 12 },
});