import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  useActivateVendorRoom,
  useCreateVendorRoom,
  useDeactivateVendorRoom,
  useListVendorHotels,
  useListVendorRooms,
  useUpdateVendorRoom,
  type VendorRoom,
  type VendorRoomInput,
} from '@workspace/api-client-react';
import { Badge, Button, Field, Panel, SectionTitle, State, VendorPage, errorText } from '@/features/vendor/VendorUI';
import { useColors } from '@/hooks/useColors';

const EMPTY: VendorRoomInput = { name: '', bedType: '', capacity: 2, totalUnits: 1, nightlyRate: 0, currency: 'INR', amenities: [], imageUrls: [] };

export default function VendorRoomsScreen() {
  const colors = useColors();
  const hotels = useListVendorHotels({ page: 1, limit: 50 });
  const rooms = useListVendorRooms();
  const create = useCreateVendorRoom();
  const update = useUpdateVendorRoom();
  const activate = useActivateVendorRoom();
  const deactivate = useDeactivateVendorRoom();
  const [form, setForm] = useState<VendorRoomInput>(EMPTY);
  const [hotelId, setHotelId] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const items = rooms.data?.items ?? [];
  const set = (key: keyof VendorRoomInput, value: string) => setForm((current) => ({ ...current, [key]: key === 'capacity' || key === 'totalUnits' || key === 'nightlyRate' ? Number(value) || 0 : value }));
  const edit = (room?: VendorRoom) => {
    setEditing(room?.id ?? null);
    if (room) setForm({ name: room.name, bedType: room.bedType, capacity: room.capacity, totalUnits: room.totalUnits, nightlyRate: room.nightlyRate, currency: room.currency, amenities: room.amenities, imageUrls: room.imageUrls });
    else setForm(EMPTY);
    setHotelId(room?.hotelId ?? hotels.data?.items[0]?.id ?? '');
    setOpen(true); setError(''); setNotice('');
  };
  const save = async () => {
    if (!form.name.trim() || form.capacity < 1 || form.totalUnits < 1 || form.nightlyRate < 0) { setError('Add a name, positive capacity and units, and a valid nightly rate.'); return; }
    if (!editing && !hotelId) { setError('Create a hotel before adding a room.'); return; }
    setError('');
    try {
      if (editing) await update.mutateAsync({ id: editing, data: form });
      else await create.mutateAsync({ hotelId, data: form });
      setOpen(false); setNotice(editing ? 'Room changes saved.' : 'Room added to your hotel.'); await rooms.refetch();
    } catch (caught) { setError(errorText(caught, 'The room could not be saved.')); }
  };
  const toggle = async (room: VendorRoom) => {
    try {
      if (room.status === 'active') await deactivate.mutateAsync({ id: room.id });
      else await activate.mutateAsync({ id: room.id });
      setNotice(room.status === 'active' ? `${room.name} was deactivated.` : `${room.name} is active again.`); await rooms.refetch();
    } catch (caught) { setError(errorText(caught, 'The room status could not be changed.')); }
  };
  return (
    <VendorPage title="Rooms and rates." eyebrow="ROOM OPERATIONS">
      <Text style={[styles.intro, { color: colors.mutedForeground }]}>Rooms are soft-deactivated so historical bookings and their prices remain intact.</Text>
      {!!notice && <Text style={[styles.notice, { color: colors.primary }]}>{notice}</Text>}
      {!!error && <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>}
      <Button label={open ? 'Close room form' : 'Add room'} onPress={() => open ? setOpen(false) : edit()} />
      {open && <Panel style={styles.form}>
        <Text style={[styles.formTitle, { color: colors.foreground }]}>{editing ? 'Edit room' : 'New room'}</Text>
        {!editing && <Text style={[styles.muted, { color: colors.mutedForeground }]}>Hotel: {hotels.data?.items.find((hotel) => hotel.id === hotelId)?.name ?? 'Select the first owned hotel'}</Text>}
        {!editing && (hotels.data?.items ?? []).map((hotel) => <Button key={hotel.id} label={hotel.id === hotelId ? `Hotel: ${hotel.name}` : hotel.name} onPress={() => setHotelId(hotel.id)} secondary={hotel.id !== hotelId} />)}
        <Field label="Room name" value={form.name} onChangeText={(v) => set('name', v)} placeholder="Garden room" />
        <Field label="Bed type" value={form.bedType ?? ''} onChangeText={(v) => set('bedType', v)} placeholder="1 king bed" />
        <Field label="Capacity" value={String(form.capacity)} onChangeText={(v) => set('capacity', v)} placeholder="2" keyboardType="numeric" />
        <Field label="Total units" value={String(form.totalUnits)} onChangeText={(v) => set('totalUnits', v)} placeholder="3" keyboardType="numeric" />
        <Field label="Nightly rate (INR)" value={String(form.nightlyRate)} onChangeText={(v) => set('nightlyRate', v)} placeholder="7800" keyboardType="numeric" />
        <Button label={create.isPending || update.isPending ? 'Saving…' : 'Save room'} onPress={save} disabled={create.isPending || update.isPending} />
      </Panel>}
      <SectionTitle>YOUR ROOMS · {items.length}</SectionTitle>
      {rooms.isLoading ? <State title="Loading rooms…" description="Fetching room inventory." /> :
        rooms.isError ? <State title="Rooms unavailable" description="We could not load your room workspace." retry={() => rooms.refetch()} /> :
        items.length === 0 ? <State title="No rooms yet" description="Add a room to one of your hotels to start managing inventory." /> :
        items.map((room) => <Panel key={room.id}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>{room.name}</Text>
              <Text style={[styles.muted, { color: colors.mutedForeground }]}>{room.bedType || 'Bed details not added'} · sleeps {room.capacity} · {room.totalUnits} units</Text>
            </View>
            <Badge label={room.status} tone={room.status === 'active' ? 'good' : 'neutral'} />
          </View>
          <Text style={[styles.rate, { color: colors.foreground }]}>₹{room.nightlyRate.toLocaleString()} <Text style={[styles.muted, { color: colors.mutedForeground }]}>per night</Text></Text>
          <View style={styles.actions}><Button label="Edit" onPress={() => edit(room)} secondary /><Button label={room.status === 'active' ? 'Deactivate' : 'Activate'} onPress={() => toggle(room)} secondary /></View>
        </Panel>)}
    </VendorPage>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 14, lineHeight: 21, marginBottom: 16 },
  notice: { fontSize: 13, marginBottom: 12 },
  error: { fontSize: 13, lineHeight: 19, marginBottom: 12 },
  form: { marginTop: 16 },
  formTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  muted: { fontSize: 13, lineHeight: 19, marginTop: 5 },
  rate: { fontSize: 17, fontWeight: '700', marginTop: 13 },
  actions: { flexDirection: 'row', gap: 9, marginTop: 14 },
});