import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  getListVendorAvailabilityQueryKey,
  useListVendorAvailability,
  useListVendorRooms,
  useUpdateVendorAvailability,
  type VendorAvailabilityItem,
} from '@workspace/api-client-react';
import { Badge, Button, Field, Panel, SectionTitle, State, VendorPage, errorText } from '@/features/vendor/VendorUI';
import { useColors } from '@/hooks/useColors';

function dateOnly(date: Date) { return date.toISOString().slice(0, 10); }
function addDays(date: Date, amount: number) { const next = new Date(date); next.setUTCDate(next.getUTCDate() + amount); return next; }

export default function VendorAvailabilityScreen() {
  const colors = useColors();
  const rooms = useListVendorRooms({ status: 'active' });
  const firstRoom = rooms.data?.items[0];
  const [roomId, setRoomId] = useState('');
  const selectedRoomId = roomId || firstRoom?.id || '';
  const [from, setFrom] = useState(dateOnly(addDays(new Date(), 1)));
  const [to, setTo] = useState(dateOnly(addDays(new Date(), 15)));
  const availability = useListVendorAvailability(
    { roomId: selectedRoomId, from, to },
    { query: { enabled: Boolean(selectedRoomId && from && to), queryKey: getListVendorAvailabilityQueryKey({ roomId: selectedRoomId, from, to }) } },
  );
  const update = useUpdateVendorAvailability();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [units, setUnits] = useState('');
  const [price, setPrice] = useState('');
  const [blackoutReason, setBlackoutReason] = useState('');
  const items = availability.data?.items ?? [];
  const selectedRoom = rooms.data?.items.find((room) => room.id === selectedRoomId);
  const rangeLabel = useMemo(() => `${from} → ${to}`, [from, to]);

  const save = async (item: VendorAvailabilityItem, status: 'available' | 'blackout') => {
    const availableUnits = status === 'blackout' ? 0 : Number(units);
    if (status === 'available' && (!Number.isInteger(availableUnits) || availableUnits < 0 || availableUnits > item.totalUnits)) {
      setError(`Available units must be between 0 and ${item.totalUnits}.`); return;
    }
    const priceOverride = price.trim() ? Number(price) : null;
    if (priceOverride !== null && (!Number.isFinite(priceOverride) || priceOverride < 0)) { setError('Price override must be a non-negative amount.'); return; }
    try {
      await update.mutateAsync({ data: { roomId: selectedRoomId, date: item.date, availableUnits, priceOverride, status, blackoutReason: status === 'blackout' ? blackoutReason || null : null } });
      setEditing(null); setNotice(`${item.date} availability saved.`); setError(''); await availability.refetch();
    } catch (caught) { setError(errorText(caught, 'Availability could not be saved.')); }
  };
  const beginEdit = (item: VendorAvailabilityItem) => { setEditing(item.date); setUnits(String(item.availableUnits)); setPrice(item.priceOverride === null ? '' : String(item.priceOverride)); setBlackoutReason(item.blackoutReason ?? ''); setError(''); };
  return (
    <VendorPage title="Availability by date." eyebrow="INVENTORY CONTROL">
      <Text style={[styles.intro, { color: colors.mutedForeground }]}>Set sellable units, dated prices, and blackout dates. Existing reservations always remain protected.</Text>
      {!!notice && <Text style={[styles.notice, { color: colors.primary }]}>{notice}</Text>}
      {!!error && <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>}
      <Panel>
        <SectionTitle>ROOM</SectionTitle>
        {rooms.data?.items.map((room) => <Button key={room.id} label={room.id === selectedRoomId ? `Selected: ${room.name}` : room.name} onPress={() => setRoomId(room.id)} secondary={room.id !== selectedRoomId} />)}
        {!rooms.isLoading && !rooms.data?.items.length && <Text style={[styles.muted, { color: colors.mutedForeground }]}>Add an active room first.</Text>}
        <Field label="From (YYYY-MM-DD)" value={from} onChangeText={setFrom} placeholder="2026-09-01" />
        <Field label="To (YYYY-MM-DD, exclusive)" value={to} onChangeText={setTo} placeholder="2026-09-15" />
        <Text style={[styles.range, { color: colors.mutedForeground }]}>{selectedRoom?.name ?? 'No room selected'} · {rangeLabel}</Text>
      </Panel>
      <SectionTitle>DATE PLAN</SectionTitle>
      {availability.isLoading ? <State title="Loading inventory…" description="Reading your server-owned dates." /> :
        availability.isError ? <State title="Inventory unavailable" description="We could not load this room's date plan." retry={() => availability.refetch()} /> :
        !selectedRoomId ? <State title="Select a room" description="Choose a room to manage date-based availability." /> :
        !items.length ? <State title="No dates in this range" description="Choose a valid future range of up to 90 nights." /> :
        items.map((item) => <Panel key={item.date}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}><Text style={[styles.date, { color: colors.foreground }]}>{item.date}</Text><Text style={[styles.muted, { color: colors.mutedForeground }]}>{item.status === 'blackout' ? item.blackoutReason || 'Blocked' : `${item.availableUnits} of ${item.totalUnits} units available`}</Text></View>
            <Badge label={item.status === 'blackout' ? 'Blackout' : 'Open'} tone={item.status === 'blackout' ? 'warn' : 'good'} />
          </View>
          {editing === item.date ? <View style={styles.edit}>
            <Field label="Available units" value={units} onChangeText={setUnits} placeholder="0" keyboardType="numeric" />
            <Field label="Price override (optional)" value={price} onChangeText={setPrice} placeholder="Leave blank for base rate" keyboardType="numeric" />
            <Field label="Blackout reason (optional)" value={blackoutReason} onChangeText={setBlackoutReason} placeholder="Maintenance, private event…" />
            <View style={styles.actions}><Button label={update.isPending ? 'Saving…' : 'Save open'} onPress={() => save(item, 'available')} disabled={update.isPending} /><Button label="Save blackout" onPress={() => save(item, 'blackout')} secondary disabled={update.isPending} /></View>
          </View> : <Button label="Edit date" onPress={() => beginEdit(item)} secondary />}
        </Panel>)}
    </VendorPage>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 14, lineHeight: 21, marginBottom: 16 },
  notice: { fontSize: 13, marginBottom: 12 },
  error: { fontSize: 13, lineHeight: 19, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  date: { fontSize: 16, fontWeight: '700' },
  muted: { fontSize: 13, lineHeight: 19, marginTop: 5 },
  range: { fontSize: 12, marginTop: 8 },
  edit: { marginTop: 14 },
  actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
});