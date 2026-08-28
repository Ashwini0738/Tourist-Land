import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

const stepTitles = ['Room', 'Dates', 'Guests', 'Summary', 'Payment', 'Done'];

export default function BookingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [step, setStep] = React.useState(0);
  const [guests, setGuests] = React.useState(2);
  const [offer, setOffer] = React.useState('');
  const [offerError, setOfferError] = React.useState('');
  const [processing, setProcessing] = React.useState(false);

  const next = () => setStep((current) => Math.min(current + 1, 5));
  const applyOffer = () => {
    if (offer.trim().toUpperCase() === 'SCENIC12') {
      setOfferError('');
    } else {
      setOfferError('That offer code is not available. Try SCENIC12.');
    }
  };
  const pay = () => {
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      setStep(5);
    }, 900);
  };

  if (step === 5) {
    return <View style={[styles.confirmation, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}><View style={[styles.confirmIcon, { backgroundColor: colors.secondary }]}><Feather name="check" size={32} color={colors.primary} /></View><Text style={[styles.confirmTitle, { color: colors.foreground }]}>Your stay is confirmed.</Text><Text style={[styles.confirmText, { color: colors.mutedForeground }]}>The Mango House · 18–21 October · {guests} guests</Text><View style={[styles.reference, { borderColor: colors.border, backgroundColor: colors.card }]}><Text style={[styles.referenceLabel, { color: colors.mutedForeground }]}>BOOKING REFERENCE</Text><Text style={[styles.referenceValue, { color: colors.foreground }]}>TL-261018</Text></View><Pressable onPress={() => router.replace('/bookings')} style={[styles.primaryButton, { backgroundColor: colors.primary }]}><Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>View my bookings</Text></Pressable><Pressable onPress={() => router.replace('/(tabs)')} style={styles.textButton}><Text style={[styles.textButtonLabel, { color: colors.primary }]}>Back to home</Text></Pressable></View>;
  }

  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 34 }]} keyboardShouldPersistTaps="handled"><View style={styles.header}><Pressable onPress={() => step ? setStep(step - 1) : router.back()}><Feather name="arrow-left" size={21} color={colors.foreground} /></Pressable><Text style={[styles.headerTitle, { color: colors.foreground }]}>Plan your stay</Text><Pressable onPress={() => router.back()}><Feather name="x" size={20} color={colors.foreground} /></Pressable></View><View style={styles.progress}>{stepTitles.slice(0, 5).map((title, index) => <View key={title} style={styles.progressItem}><View style={[styles.progressDot, { backgroundColor: index <= step ? colors.primary : colors.muted }]} /><Text style={[styles.progressLabel, { color: index === step ? colors.foreground : colors.mutedForeground }]}>{title}</Text></View>)}</View>

    {step === 0 ? <View><Text style={[styles.kicker, { color: colors.primary }]}>ROOM SELECTION</Text><Text style={[styles.title, { color: colors.foreground }]}>Choose how you’d{'\n'}like to stay.</Text>{['Garden Room · ₹7,800', 'Courtyard Suite · ₹10,200'].map((room, index) => <Pressable key={room} onPress={next} style={[styles.choice, { backgroundColor: colors.card, borderColor: index === 0 ? colors.primary : colors.border }]}><View style={[styles.choiceIcon, { backgroundColor: colors.secondary }]}><Feather name="home" size={19} color={colors.primary} /></View><View style={styles.choiceCopy}><Text style={[styles.choiceTitle, { color: colors.foreground }]}>{room}</Text><Text style={[styles.choiceText, { color: colors.mutedForeground }]}>{index === 0 ? 'King bed · Garden view' : 'King bed · Private terrace'}</Text></View><Feather name="chevron-right" size={18} color={colors.mutedForeground} /></Pressable>)}</View> : null}

    {step === 1 ? <View><Text style={[styles.kicker, { color: colors.primary }]}>DATE SELECTION</Text><Text style={[styles.title, { color: colors.foreground }]}>When are you{'\n'}getting away?</Text><View style={[styles.calendar, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={styles.calendarHead}><Pressable><Feather name="chevron-left" size={19} color={colors.foreground} /></Pressable><Text style={[styles.calendarTitle, { color: colors.foreground }]}>October 2026</Text><Pressable><Feather name="chevron-right" size={19} color={colors.foreground} /></Pressable></View><View style={styles.week}>{['M','T','W','T','F','S','S'].map((day, i) => <Text key={`${day}-${i}`} style={[styles.weekDay, { color: colors.mutedForeground }]}>{day}</Text>)}</View><View style={styles.days}>{Array.from({ length: 28 }).map((_, index) => <Pressable key={index} style={[styles.day, (index === 17 || index === 20) && { backgroundColor: colors.primary }]}><Text style={[styles.dayText, { color: index === 17 || index === 20 ? colors.primaryForeground : colors.foreground }]}>{index + 1}</Text></Pressable>)}</View></View><Pressable onPress={next} style={[styles.primaryButton, { backgroundColor: colors.primary }]}><Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>Check availability</Text></Pressable></View> : null}

    {step === 2 ? <View><Text style={[styles.kicker, { color: colors.primary }]}>GUEST DETAILS</Text><Text style={[styles.title, { color: colors.foreground }]}>Who’s coming?</Text><View style={[styles.guestRow, { backgroundColor: colors.card, borderColor: colors.border }]}><View><Text style={[styles.choiceTitle, { color: colors.foreground }]}>Adults</Text><Text style={[styles.choiceText, { color: colors.mutedForeground }]}>Ages 13 and above</Text></View><View style={styles.counter}><Pressable onPress={() => setGuests(Math.max(1, guests - 1))} style={[styles.counterButton, { borderColor: colors.border }]}><Feather name="minus" size={16} color={colors.foreground} /></Pressable><Text style={[styles.counterValue, { color: colors.foreground }]}>{guests}</Text><Pressable onPress={() => setGuests(Math.min(8, guests + 1))} style={[styles.counterButton, { borderColor: colors.border }]}><Feather name="plus" size={16} color={colors.foreground} /></Pressable></View></View><TextInput placeholder="Guest name" placeholderTextColor={colors.mutedForeground} style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]} /><TextInput placeholder="Contact email" placeholderTextColor={colors.mutedForeground} keyboardType="email-address" autoCapitalize="none" style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]} /><Pressable onPress={next} style={[styles.primaryButton, { backgroundColor: colors.primary }]}><Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>Review booking</Text></Pressable></View> : null}

    {step === 3 ? <View><Text style={[styles.kicker, { color: colors.primary }]}>BOOKING SUMMARY</Text><Text style={[styles.title, { color: colors.foreground }]}>Everything look right?</Text><View style={[styles.summary, { backgroundColor: colors.card, borderColor: colors.border }]}><SummaryRow label="Garden Room" value="₹23,400" colors={colors} /><SummaryRow label="3 nights · 18–21 Oct" value={`${guests} guests`} colors={colors} /><SummaryRow label="Service fee" value="₹1,170" colors={colors} /><View style={[styles.divider, { backgroundColor: colors.border }]} /><SummaryRow label="Total" value={offerError === '' && offer ? '₹21,762' : '₹24,570'} colors={colors} strong /></View><View style={styles.offerRow}><TextInput value={offer} onChangeText={setOffer} placeholder="Offer code" placeholderTextColor={colors.mutedForeground} autoCapitalize="characters" style={[styles.offerInput, { backgroundColor: colors.card, borderColor: offerError ? colors.destructive : colors.border, color: colors.foreground }]} /><Pressable onPress={applyOffer} style={[styles.offerButton, { backgroundColor: colors.secondary }]}><Text style={[styles.offerButtonText, { color: colors.primary }]}>Apply</Text></Pressable></View>{offerError ? <Text style={[styles.errorText, { color: colors.destructive }]}>{offerError}</Text> : offer ? <Text style={[styles.successText, { color: colors.primary }]}>Offer applied successfully.</Text> : null}<Pressable onPress={next} style={[styles.primaryButton, { backgroundColor: colors.primary }]}><Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>Continue to payment</Text></Pressable></View> : null}

    {step === 4 ? <View><Text style={[styles.kicker, { color: colors.primary }]}>SECURE PAYMENT</Text><Text style={[styles.title, { color: colors.foreground }]}>Choose how to pay.</Text><View style={[styles.choice, { backgroundColor: colors.card, borderColor: colors.primary }]}><View style={[styles.choiceIcon, { backgroundColor: colors.secondary }]}><Feather name="credit-card" size={19} color={colors.primary} /></View><View style={styles.choiceCopy}><Text style={[styles.choiceTitle, { color: colors.foreground }]}>Card or UPI</Text><Text style={[styles.choiceText, { color: colors.mutedForeground }]}>Provider connects after account setup</Text></View><Feather name="check-circle" size={18} color={colors.primary} /></View><View style={[styles.skeletonCard, { backgroundColor: colors.card, borderColor: colors.border }]}>{processing ? <><View style={[styles.skeletonLine, { backgroundColor: colors.muted }]} /><View style={[styles.skeletonLineShort, { backgroundColor: colors.muted }]} /><ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} /><Text style={[styles.processingText, { color: colors.mutedForeground }]}>Confirming your booking…</Text></> : <><Text style={[styles.choiceTitle, { color: colors.foreground }]}>Payment preview</Text><Text style={[styles.choiceText, { color: colors.mutedForeground, marginTop: 6 }]}>No live charge is made in this wireframe.</Text></>}</View><Pressable disabled={processing} onPress={pay} style={[styles.primaryButton, { backgroundColor: processing ? colors.muted : colors.primary }]}><Text style={[styles.primaryButtonText, { color: processing ? colors.mutedForeground : colors.primaryForeground }]}>{processing ? 'Processing…' : 'Confirm booking'}</Text></Pressable></View> : null}
  </ScrollView>;
}

function SummaryRow({ label, value, colors, strong = false }: { label: string; value: string; colors: ReturnType<typeof useColors>; strong?: boolean }) {
  return <View style={styles.summaryRow}><Text style={[strong ? styles.summaryStrong : styles.summaryLabel, { color: strong ? colors.foreground : colors.mutedForeground }]}>{label}</Text><Text style={[strong ? styles.summaryStrong : styles.summaryValue, { color: colors.foreground }]}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  headerTitle: { fontSize: 15, fontWeight: '700' },
  progress: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 31 },
  progressItem: { alignItems: 'center', gap: 5 },
  progressDot: { width: 8, height: 8, borderRadius: 4 },
  progressLabel: { fontSize: 9, fontWeight: '600' },
  kicker: { fontSize: 10, fontWeight: '700', letterSpacing: 1.4, marginBottom: 8 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.7, marginBottom: 24 },
  choice: { borderWidth: 1, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 11 },
  choiceIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  choiceCopy: { flex: 1, marginLeft: 12 },
  choiceTitle: { fontSize: 14, fontWeight: '700' },
  choiceText: { fontSize: 11, marginTop: 4 },
  primaryButton: { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 15 },
  primaryButtonText: { fontSize: 14, fontWeight: '700' },
  calendar: { borderWidth: 1, borderRadius: 20, padding: 16 },
  calendarHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  calendarTitle: { fontSize: 14, fontWeight: '700' },
  week: { flexDirection: 'row', marginTop: 20 },
  weekDay: { width: '14.28%', textAlign: 'center', fontSize: 10, fontWeight: '700' },
  days: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  day: { width: '14.28%', height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18 },
  dayText: { fontSize: 12, fontWeight: '600' },
  guestRow: { borderWidth: 1, borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  counter: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  counterButton: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  counterValue: { fontSize: 15, fontWeight: '700' },
  input: { height: 53, borderWidth: 1, borderRadius: 15, paddingHorizontal: 15, fontSize: 14, marginBottom: 10 },
  summary: { borderWidth: 1, borderRadius: 19, padding: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 13 },
  summaryLabel: { fontSize: 12 },
  summaryValue: { fontSize: 12, fontWeight: '600' },
  summaryStrong: { fontSize: 15, fontWeight: '700' },
  divider: { height: 1, marginBottom: 14 },
  offerRow: { flexDirection: 'row', gap: 9, marginTop: 12 },
  offerInput: { flex: 1, height: 50, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, fontSize: 13 },
  offerButton: { height: 50, borderRadius: 14, paddingHorizontal: 19, alignItems: 'center', justifyContent: 'center' },
  offerButtonText: { fontSize: 12, fontWeight: '700' },
  errorText: { fontSize: 11, marginTop: 7 },
  successText: { fontSize: 11, marginTop: 7, fontWeight: '600' },
  skeletonCard: { borderWidth: 1, borderRadius: 18, padding: 17, minHeight: 128, marginTop: 13 },
  skeletonLine: { height: 13, borderRadius: 7, width: '78%' },
  skeletonLineShort: { height: 13, borderRadius: 7, width: '48%', marginTop: 10 },
  processingText: { textAlign: 'center', fontSize: 11, marginTop: 9 },
  confirmation: { flex: 1, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' },
  confirmIcon: { width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center' },
  confirmTitle: { fontSize: 28, fontWeight: '700', letterSpacing: -0.7, textAlign: 'center', marginTop: 22 },
  confirmText: { fontSize: 13, textAlign: 'center', lineHeight: 19, marginTop: 9 },
  reference: { borderWidth: 1, borderRadius: 16, padding: 15, width: '100%', alignItems: 'center', marginTop: 25 },
  referenceLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.2 },
  referenceValue: { fontSize: 18, fontWeight: '700', marginTop: 7 },
  textButton: { padding: 15 },
  textButtonLabel: { fontSize: 13, fontWeight: '700' },
});