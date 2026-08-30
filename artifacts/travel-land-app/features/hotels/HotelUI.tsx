import React, { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { PlatformIcon as Feather } from '@/components/PlatformIcon';
import { useColors } from '@/hooks/useColors';
import { getImageSource } from '@/features/home/utils/images';
import type { HotelNearbyPlace, HotelRoom, HotelSummary } from '@workspace/api-client-react';

export type HotelSearchSelection = {
  checkIn?: string;
  checkOut?: string;
  adults: number;
  children: number;
  rooms: number;
};

export function formatDate(value?: string) {
  if (!value) return 'Choose dates';
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function formatDateRange(selection: HotelSearchSelection) {
  if (!selection.checkIn || !selection.checkOut) return 'Dates optional';
  return `${formatDate(selection.checkIn)} – ${formatDate(selection.checkOut)}`;
}

export function todayPlus(days: number) {
  const value = new Date();
  value.setHours(12, 0, 0, 0);
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}

export function ImageWithFallback({ imageKey, style, label }: { imageKey?: string; style: any; label: string }) {
  const colors = useColors();
  const [failed, setFailed] = useState(false);
  const source = getImageSource(failed ? undefined : imageKey);
  return (
    <View style={[style, styles.imageFrame, { backgroundColor: colors.secondary }]}>
      <Image
        source={source}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
        accessibilityLabel={label}
        onError={() => setFailed(true)}
      />
      {failed ? (
        <View style={[StyleSheet.absoluteFill, styles.imageFallback, { backgroundColor: colors.secondary }]}>
          <Feather name="image" size={22} color={colors.mutedForeground} accessibilityLabel="Image unavailable" />
          <Text style={[styles.imageFallbackText, { color: colors.mutedForeground }]}>Image unavailable</Text>
        </View>
      ) : null}
    </View>
  );
}

export function SourceBadge({ label, source }: { label: string; source?: string }) {
  const colors = useColors();
  const isUnavailable = source === 'unavailable';
  return (
    <View style={[styles.sourceBadge, { backgroundColor: isUnavailable ? colors.muted : colors.accent }]}>
      <View style={[styles.sourceDot, { backgroundColor: isUnavailable ? colors.destructive : colors.primary }]} />
      <Text style={[styles.sourceText, { color: isUnavailable ? colors.destructive : colors.accentForeground }]}>{label}</Text>
    </View>
  );
}

export function NoticeBanner({
  children,
  error = false,
  onRetry,
  onAction,
  actionLabel,
  actionTestID,
}: {
  children: React.ReactNode;
  error?: boolean;
  onRetry?: () => void;
  onAction?: () => void;
  actionLabel?: string;
  actionTestID?: string;
}) {
  const colors = useColors();
  const action = onAction ?? onRetry;
  const label = actionLabel ?? (onRetry ? 'Retry' : 'Action');
  return (
    <View style={[styles.notice, { backgroundColor: error ? colors.muted : colors.secondary, borderColor: colors.border }]}>
      <Feather name={error ? 'alert-circle' : 'shield'} size={16} color={error ? colors.destructive : colors.primary} />
      <Text style={[styles.noticeText, { color: colors.mutedForeground }]}>{children}</Text>
      {action ? (
        <Pressable testID={actionTestID ?? (onRetry ? 'hotel-retry' : 'hotel-notice-action')} accessibilityRole="button" accessibilityLabel={label} onPress={action}>
          <Text style={[styles.noticeAction, { color: colors.primary }]}>{label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function HotelHeader({ title, onBack, right }: { title?: string; onBack: () => void; right?: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={styles.header}>
      <Pressable testID="hotel-back" accessibilityRole="button" accessibilityLabel="Go back" onPress={onBack} style={styles.iconButton}>
        <Feather name="arrow-left" size={20} color={colors.foreground} />
      </Pressable>
      {title ? <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>{title}</Text> : <View />}
      {right ?? <View style={styles.iconButton} />}
    </View>
  );
}

export function FavoriteButton({ favorite, label, onPress, light = false }: { favorite: boolean; label: string; onPress: () => void; light?: boolean }) {
  const colors = useColors();
  return (
    <Pressable
      testID="hotel-favorite"
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: favorite }}
      onPress={onPress}
      style={[styles.iconButton, light && { backgroundColor: 'rgba(31,42,36,0.44)', borderRadius: 21 }]}
    >
      <Feather name="heart" size={19} color={favorite ? colors.destructive : light ? colors.primaryForeground : colors.foreground} fill={favorite ? colors.destructive : 'transparent'} />
    </Pressable>
  );
}

export function SearchBar({ value, onChangeText }: { value: string; onChangeText: (value: string) => void }) {
  const colors = useColors();
  return (
    <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Feather name="search" size={18} color={colors.primary} />
      <TextInput
        testID="hotel-search"
        accessibilityLabel="Search hotels"
        value={value}
        onChangeText={onChangeText}
        placeholder="Search a place or stay"
        placeholderTextColor={colors.mutedForeground}
        style={[styles.searchInput, { color: colors.foreground }]}
        returnKeyType="search"
      />
      {value ? (
        <Pressable testID="hotel-search-clear" accessibilityRole="button" accessibilityLabel="Clear hotel search" onPress={() => onChangeText('')}>
          <Feather name="x-circle" size={18} color={colors.mutedForeground} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function DateGuestControls({
  selection,
  onChange,
  onPrepare,
}: {
  selection: HotelSearchSelection;
  onChange: (next: HotelSearchSelection) => void;
  onPrepare?: () => void;
}) {
  const colors = useColors();
  const [sheet, setSheet] = useState<'dates' | 'guests' | null>(null);
  const [dateDraft, setDateDraft] = useState({ checkIn: selection.checkIn ?? '', checkOut: selection.checkOut ?? '' });
  const dateOptions = [
    { checkIn: todayPlus(7), checkOut: todayPlus(9) },
    { checkIn: todayPlus(14), checkOut: todayPlus(17) },
    { checkIn: todayPlus(30), checkOut: todayPlus(33) },
  ];
  const updateCount = (key: 'adults' | 'children' | 'rooms', delta: number) => {
    const minimum = key === 'adults' || key === 'rooms' ? 1 : 0;
    onChange({ ...selection, [key]: Math.max(minimum, selection[key] + delta) });
  };
  const dateError = getDateError(dateDraft.checkIn, dateDraft.checkOut);
  const saveDates = () => {
    if (dateError) return;
    onChange({
      ...selection,
      checkIn: dateDraft.checkIn || undefined,
      checkOut: dateDraft.checkOut || undefined,
    });
    setSheet(null);
  };
  return (
    <>
      <View style={styles.controlsRow}>
        <Pressable testID="hotel-dates-control" accessibilityRole="button" accessibilityLabel="Choose check-in and check-out dates" onPress={() => { setDateDraft({ checkIn: selection.checkIn ?? '', checkOut: selection.checkOut ?? '' }); setSheet('dates'); }} style={[styles.controlCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="calendar" size={16} color={colors.primary} />
          <View style={styles.controlCopy}><Text style={[styles.controlLabel, { color: colors.mutedForeground }]}>DATES</Text><Text style={[styles.controlValue, { color: colors.foreground }]} numberOfLines={1}>{formatDateRange(selection)}</Text></View>
        </Pressable>
        <Pressable testID="hotel-guests-control" accessibilityRole="button" accessibilityLabel="Choose guests and rooms" onPress={() => setSheet('guests')} style={[styles.controlCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="user" size={16} color={colors.primary} />
          <View style={styles.controlCopy}><Text style={[styles.controlLabel, { color: colors.mutedForeground }]}>TRAVELLERS</Text><Text style={[styles.controlValue, { color: colors.foreground }]} numberOfLines={1}>{selection.adults} adult{selection.adults === 1 ? '' : 's'} · {selection.rooms} room{selection.rooms === 1 ? '' : 's'}</Text></View>
        </Pressable>
      </View>
      {onPrepare ? (
        <Pressable testID="hotel-prepare-request" accessibilityRole="button" accessibilityLabel="Check hotel availability" onPress={onPrepare} style={[styles.prepareButton, { backgroundColor: colors.primary }]}>
          <Text style={[styles.prepareButtonText, { color: colors.primaryForeground }]}>Check availability</Text>
          <Feather name="arrow-right" size={16} color={colors.primaryForeground} />
        </Pressable>
      ) : null}
      <Modal visible={Boolean(sheet)} transparent animationType="slide" onRequestClose={() => setSheet(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setSheet(null)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.background }]} onPress={(event) => event.stopPropagation()}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            {sheet === 'dates' ? (
              <>
                <Text style={[styles.sheetKicker, { color: colors.primary }]}>TRIP WINDOW</Text>
                <Text style={[styles.sheetTitle, { color: colors.foreground }]}>When might you go?</Text>
                <Text style={[styles.sheetBody, { color: colors.mutedForeground }]}>Dates shape your discovery or availability request. Availability results are clearly labeled when a provider is configured.</Text>
                <View style={styles.dateInputRow}>
                  <View style={styles.dateInputWrap}>
                    <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>CHECK-IN</Text>
                    <TextInput
                      testID="hotel-check-in"
                      accessibilityLabel="Check-in date"
                      value={dateDraft.checkIn}
                      onChangeText={(value) => setDateDraft((current) => ({ ...current, checkIn: value }))}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors.mutedForeground}
                      autoCapitalize="none"
                      style={[styles.dateInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                    />
                  </View>
                  <View style={styles.dateInputWrap}>
                    <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>CHECK-OUT</Text>
                    <TextInput
                      testID="hotel-check-out"
                      accessibilityLabel="Check-out date"
                      value={dateDraft.checkOut}
                      onChangeText={(value) => setDateDraft((current) => ({ ...current, checkOut: value }))}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors.mutedForeground}
                      autoCapitalize="none"
                      style={[styles.dateInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                    />
                  </View>
                </View>
                {dateError ? <Text testID="hotel-date-error" style={[styles.dateError, { color: colors.destructive }]}>{dateError}</Text> : null}
                {dateOptions.map((option) => {
                  const selected = selection.checkIn === option.checkIn;
                  return (
                    <Pressable key={option.checkIn} testID={`hotel-date-option-${option.checkIn}`} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => { onChange({ ...selection, ...option }); setSheet(null); }} style={[styles.optionRow, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.secondary : colors.card }]}>
                      <Feather name="calendar" size={17} color={colors.primary} />
                      <Text style={[styles.optionText, { color: colors.foreground }]}>{formatDate(option.checkIn)} – {formatDate(option.checkOut)}</Text>
                      {selected ? <Feather name="check" size={17} color={colors.primary} /> : null}
                    </Pressable>
                  );
                })}
                <Pressable testID="hotel-save-dates" accessibilityRole="button" accessibilityLabel="Save dates" disabled={Boolean(dateError)} onPress={saveDates} style={[styles.prepareButton, { backgroundColor: colors.primary, opacity: dateError ? 0.45 : 1 }]}><Text style={[styles.prepareButtonText, { color: colors.primaryForeground }]}>Save dates</Text></Pressable>
                <Pressable testID="hotel-clear-dates" accessibilityRole="button" accessibilityLabel="Clear dates" onPress={() => { onChange({ ...selection, checkIn: undefined, checkOut: undefined }); setSheet(null); }} style={styles.sheetTextButton}><Text style={[styles.sheetTextButtonLabel, { color: colors.mutedForeground }]}>Keep dates open</Text></Pressable>
              </>
            ) : (
              <>
                <Text style={[styles.sheetKicker, { color: colors.primary }]}>TRAVELLERS</Text>
                <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Who is coming?</Text>
                <CounterRow label="Adults" value={selection.adults} onChange={(delta) => updateCount('adults', delta)} />
                <CounterRow label="Children" value={selection.children} onChange={(delta) => updateCount('children', delta)} />
                <CounterRow label="Rooms" value={selection.rooms} onChange={(delta) => updateCount('rooms', delta)} />
                <Pressable testID="hotel-guests-done" accessibilityRole="button" accessibilityLabel="Save guests and rooms" onPress={() => setSheet(null)} style={[styles.prepareButton, { backgroundColor: colors.primary }]}><Text style={[styles.prepareButtonText, { color: colors.primaryForeground }]}>Save travellers</Text></Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function getDateError(checkIn: string, checkOut: string) {
  if (!checkIn && !checkOut) return '';
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(checkIn) || !datePattern.test(checkOut)) return 'Use YYYY-MM-DD for both dates.';
  const start = new Date(`${checkIn}T12:00:00`);
  const end = new Date(`${checkOut}T12:00:00`);
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start.toISOString().slice(0, 10) !== checkIn || end.toISOString().slice(0, 10) !== checkOut) return 'Enter real calendar dates.';
  if (start < today) return 'Check-in must be a future date.';
  if (end <= start) return 'Check-out must be after check-in.';
  return '';
}

function CounterRow({ label, value, onChange }: { label: string; value: number; onChange: (delta: number) => void }) {
  const colors = useColors();
  return (
    <View style={[styles.counterRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.counterLabel, { color: colors.foreground }]}>{label}</Text>
      <View style={styles.counter}>
        <Pressable testID={`hotel-counter-${label.toLowerCase()}-minus`} accessibilityRole="button" accessibilityLabel={`Decrease ${label}`} onPress={() => onChange(-1)} style={[styles.counterButton, { borderColor: colors.border }]}><Feather name="minus" size={15} color={colors.primary} /></Pressable>
        <Text style={[styles.counterValue, { color: colors.foreground }]}>{value}</Text>
        <Pressable testID={`hotel-counter-${label.toLowerCase()}-plus`} accessibilityRole="button" accessibilityLabel={`Increase ${label}`} onPress={() => onChange(1)} style={[styles.counterButton, { borderColor: colors.border }]}><Feather name="plus" size={15} color={colors.primary} /></Pressable>
      </View>
    </View>
  );
}

export function HotelCard({ item, favorite, onFavorite, onPress }: { item: HotelSummary; favorite: boolean; onFavorite: () => void; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable testID={`hotel-card-${item.id}`} accessibilityRole="button" accessibilityLabel={`Open ${item.name}`} onPress={onPress} style={({ pressed }) => [styles.hotelCard, { backgroundColor: colors.card, borderColor: colors.border, transform: [{ scale: pressed ? 0.985 : 1 }] }]}>
      <View style={styles.cardImageWrap}>
        <ImageWithFallback imageKey={item.imageKey} label={`${item.name} image`} style={styles.cardImage} />
        <View style={[styles.cardBadge, { backgroundColor: colors.accent }]}><Text style={[styles.cardBadgeText, { color: colors.accentForeground }]}>{item.hotelType || 'STAY'}</Text></View>
        <Pressable testID={`hotel-favorite-${item.id}`} accessibilityRole="button" accessibilityLabel={`${favorite ? 'Remove' : 'Add'} ${item.name} ${favorite ? 'from' : 'to'} favorites`} onPress={(event) => { event.stopPropagation(); onFavorite(); }} style={[styles.cardFavorite, { backgroundColor: colors.card }]}>
          <Feather name="heart" size={17} color={favorite ? colors.destructive : colors.foreground} fill={favorite ? colors.destructive : 'transparent'} />
        </Pressable>
      </View>
      <View style={styles.cardContent}>
        <SourceBadge label={item.sourceLabel || 'Catalog sample'} source={item.source} />
        <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
        <View style={styles.locationLine}><Feather name="map-pin" size={13} color={colors.mutedForeground} /><Text style={[styles.locationText, { color: colors.mutedForeground }]} numberOfLines={1}>{item.location}</Text></View>
        <Text style={[styles.cardSummary, { color: colors.mutedForeground }]} numberOfLines={2}>{item.summary}</Text>
        <View style={styles.cardBottom}><Text style={[styles.rating, { color: colors.accentForeground }]}><Feather name="star" size={13} color={colors.accentForeground} fill={colors.accent} /> {item.ratingLabel || item.rating.toFixed(1)}</Text><Text style={[styles.price, { color: colors.primary }]}>{item.priceLabel}<Text style={[styles.priceSuffix, { color: colors.mutedForeground }]}> / sample night</Text></Text></View>
      </View>
    </Pressable>
  );
}

export function HotelSkeleton() {
  const colors = useColors();
  return (
    <View testID="hotel-loading" accessibilityLabel="Loading hotels" style={[styles.hotelCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.skeletonImage, { backgroundColor: colors.secondary }]} />
      <View style={styles.cardContent}><View style={[styles.skeletonLine, { backgroundColor: colors.secondary, width: '34%' }]} /><View style={[styles.skeletonLine, { backgroundColor: colors.secondary, width: '76%', height: 20 }]} /><View style={[styles.skeletonLine, { backgroundColor: colors.secondary, width: '55%' }]} /><View style={[styles.skeletonLine, { backgroundColor: colors.secondary, width: '92%', height: 28 }]} /></View>
    </View>
  );
}

export function EmptyHotels({ query, onReset }: { query: string; onReset: () => void }) {
  const colors = useColors();
  return (
    <View testID="hotel-empty" style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}><Feather name="compass" size={24} color={colors.primary} /></View>
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{query ? 'No stays found there yet.' : 'The catalog is quiet.'}</Text>
      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{query ? 'Try a nearby place or a broader search. We only show stays that belong in the catalog.' : 'Try another search or clear the filters to keep exploring.'}</Text>
      <Pressable testID="hotel-empty-reset" accessibilityRole="button" accessibilityLabel="Reset hotel search" onPress={onReset}><Text style={[styles.emptyAction, { color: colors.primary }]}>Reset search</Text></Pressable>
    </View>
  );
}

export function RoomRow({ room }: { room: HotelRoom }) {
  const colors = useColors();
  return <View testID={`hotel-room-${room.id}`} style={[styles.roomRow, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={{ flex: 1 }}><Text style={[styles.roomName, { color: colors.foreground }]}>{room.name}</Text><Text style={[styles.roomMeta, { color: colors.mutedForeground }]}>Sleeps {room.capacity} · {room.status}</Text></View><Text style={[styles.roomRate, { color: colors.primary }]}>{room.currency} {room.nightlyRate.toLocaleString()}<Text style={styles.roomRateSuffix}> / night</Text></Text></View>;
}

export function NearbyRow({ place, onPress }: { place: HotelNearbyPlace; onPress: () => void }) {
  const colors = useColors();
  return <Pressable testID={`hotel-nearby-${place.id}`} accessibilityRole="button" accessibilityLabel={`Open ${place.name}`} onPress={onPress} style={[styles.nearbyRow, { borderBottomColor: colors.border }]}><ImageWithFallback imageKey={place.imageKey} label={`${place.name} image`} style={styles.nearbyImage} /><View style={styles.nearbyCopy}><Text style={[styles.nearbyCategory, { color: colors.primary }]}>{place.category}</Text><Text style={[styles.nearbyName, { color: colors.foreground }]} numberOfLines={1}>{place.name}</Text><Text style={[styles.nearbyLocation, { color: colors.mutedForeground }]} numberOfLines={1}>{place.location}{place.distanceLabel ? ` · ${place.distanceLabel}` : ''}</Text></View><Feather name="arrow-up-right" size={16} color={colors.primary} /></Pressable>;
}

const styles = StyleSheet.create({
  imageFrame: { overflow: 'hidden' },
  imageFallback: { alignItems: 'center', justifyContent: 'center' },
  imageFallbackText: { fontSize: 10, marginTop: 5 },
  sourceBadge: { alignSelf: 'flex-start', borderRadius: 100, paddingHorizontal: 8, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 5 },
  sourceDot: { width: 6, height: 6, borderRadius: 3 },
  sourceText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },
  notice: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 11, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  noticeText: { flex: 1, fontSize: 11, lineHeight: 15 },
  noticeAction: { fontSize: 11, fontWeight: '800' },
  header: { height: 64, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700' },
  iconButton: { width: 42, height: 42, justifyContent: 'center', alignItems: 'center' },
  searchBar: { height: 52, borderWidth: 1, borderRadius: 17, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center' },
  searchInput: { flex: 1, fontSize: 14, marginLeft: 9 },
  controlsRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  controlCard: { flex: 1, minHeight: 58, borderWidth: 1, borderRadius: 15, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  controlCopy: { flex: 1 },
  controlLabel: { fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  controlValue: { fontSize: 11, fontWeight: '700', marginTop: 3 },
  prepareButton: { minHeight: 51, marginTop: 11, borderRadius: 15, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  prepareButtonText: { fontSize: 12, fontWeight: '800' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(31,42,36,0.42)' },
  sheet: { borderTopLeftRadius: 27, borderTopRightRadius: 27, padding: 22, paddingBottom: 32 },
  sheetHandle: { width: 40, height: 4, borderRadius: 4, alignSelf: 'center', marginBottom: 22 },
  sheetKicker: { fontSize: 9, fontWeight: '800', letterSpacing: 1.6 },
  sheetTitle: { fontSize: 25, fontWeight: '700', letterSpacing: -0.5, marginTop: 5 },
  sheetBody: { fontSize: 12, lineHeight: 18, marginTop: 7, marginBottom: 18 },
  dateInputRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  dateInputWrap: { flex: 1 },
  inputLabel: { fontSize: 8, fontWeight: '800', letterSpacing: 0.9, marginBottom: 6 },
  dateInput: { minHeight: 44, borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, fontSize: 12 },
  dateError: { fontSize: 11, lineHeight: 16, marginBottom: 8 },
  optionRow: { minHeight: 52, borderWidth: 1, borderRadius: 14, paddingHorizontal: 13, marginBottom: 9, flexDirection: 'row', alignItems: 'center', gap: 10 },
  optionText: { flex: 1, fontSize: 13, fontWeight: '600' },
  sheetTextButton: { alignItems: 'center', paddingVertical: 14 },
  sheetTextButtonLabel: { fontSize: 12, fontWeight: '700' },
  counterRow: { minHeight: 64, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  counterLabel: { fontSize: 14, fontWeight: '600' },
  counter: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  counterButton: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  counterValue: { width: 18, textAlign: 'center', fontSize: 14, fontWeight: '700' },
  hotelCard: { borderWidth: 1, borderRadius: 21, overflow: 'hidden', marginBottom: 14 },
  cardImageWrap: { position: 'relative' },
  cardImage: { width: '100%', height: 188 },
  cardBadge: { position: 'absolute', top: 12, left: 12, borderRadius: 100, paddingHorizontal: 9, paddingVertical: 5 },
  cardBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
  cardFavorite: { position: 'absolute', top: 10, right: 10, width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  cardContent: { padding: 14 },
  cardTitle: { fontSize: 19, fontWeight: '700', marginTop: 10, letterSpacing: -0.25 },
  locationLine: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  locationText: { flex: 1, fontSize: 11 },
  cardSummary: { fontSize: 12, lineHeight: 17, marginTop: 10 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 14 },
  rating: { fontSize: 12, fontWeight: '700' },
  price: { fontSize: 14, fontWeight: '800' },
  priceSuffix: { fontSize: 10, fontWeight: '400' },
  skeletonImage: { height: 188 },
  skeletonLine: { height: 12, borderRadius: 6, marginTop: 11 },
  emptyState: { borderWidth: 1, borderRadius: 21, alignItems: 'center', padding: 24, marginTop: 4 },
  emptyIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginTop: 14 },
  emptyText: { fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 7 },
  emptyAction: { fontSize: 12, fontWeight: '800', marginTop: 15 },
  roomRow: { borderWidth: 1, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 9 },
  roomName: { fontSize: 14, fontWeight: '700' },
  roomMeta: { fontSize: 11, marginTop: 5 },
  roomRate: { fontSize: 13, fontWeight: '800', marginLeft: 10 },
  roomRateSuffix: { fontSize: 10, fontWeight: '400' },
  nearbyRow: { minHeight: 82, borderBottomWidth: 1, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 10 },
  nearbyImage: { width: 64, height: 60, borderRadius: 11 },
  nearbyCopy: { flex: 1 },
  nearbyCategory: { fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  nearbyName: { fontSize: 13, fontWeight: '700', marginTop: 4 },
  nearbyLocation: { fontSize: 10, marginTop: 3 },
});
