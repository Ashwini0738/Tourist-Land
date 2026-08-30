import { PlatformIcon as Feather } from '@/components/PlatformIcon';
import { useColors } from '@/hooks/useColors';
import { useCreateReview } from '@workspace/api-client-react';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function first(value?: string | string[]) { return Array.isArray(value) ? value[0] : value; }

export default function ReviewFormScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ hotelId?: string | string[]; bookingReference?: string | string[]; hotelName?: string | string[] }>();
  const hotelId = first(params.hotelId) ?? '';
  const bookingReference = first(params.bookingReference) ?? '';
  const hotelName = first(params.hotelName) ?? 'Hotel';
  const [rating, setRating] = React.useState(0);
  const [title, setTitle] = React.useState('');
  const [body, setBody] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const mutation = useCreateReview();
  const submit = async () => {
    if (!rating) { setError('Choose a rating first.'); return; }
    if (body.trim() && body.trim().length < 10) { setError('Your comment needs at least 10 characters.'); return; }
    setError(null);
    try {
      await mutation.mutateAsync({ data: { entityType: 'hotel', entityId: hotelId, bookingReference, rating, title: title.trim() || null, body: body.trim() || null } });
      router.replace('/reviews');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The review could not be submitted.');
    }
  };
  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 30 }]}><View style={styles.header}><Pressable accessibilityRole="button" onPress={() => router.back()}><Feather name="arrow-left" size={21} color={colors.foreground} /></Pressable><Text style={[styles.headerTitle, { color: colors.foreground }]}>Write a review</Text><View style={{ width: 21 }} /></View><Text style={[styles.kicker, { color: colors.primary }]}>VERIFIED STAY</Text><Text style={[styles.title, { color: colors.foreground }]}>{hotelName}</Text><Text style={[styles.reference, { color: colors.mutedForeground }]}>Booking {bookingReference}</Text><Text style={[styles.label, { color: colors.foreground }]}>Your rating</Text><View style={styles.stars}>{[1, 2, 3, 4, 5].map((value) => <Pressable key={value} accessibilityRole="button" accessibilityLabel={`${value} star${value === 1 ? '' : 's'}`} onPress={() => setRating(value)}><Feather name="star" size={34} color={value <= rating ? '#EAB308' : colors.border} fill={value <= rating ? '#EAB308' : 'transparent'} /></Pressable>)}</View><TextInput value={title} onChangeText={setTitle} placeholder="Headline (optional)" placeholderTextColor={colors.mutedForeground} style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground }]} maxLength={120} /><TextInput value={body} onChangeText={setBody} placeholder="What should another traveller know? (optional)" placeholderTextColor={colors.mutedForeground} style={[styles.input, styles.textarea, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground }]} multiline maxLength={2000} textAlignVertical="top" /><Text style={[styles.note, { color: colors.mutedForeground }]}>Only completed paid stays can be reviewed. Your review may be moderated before it is displayed.</Text>{error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}<Pressable disabled={mutation.isPending} onPress={() => void submit()} style={[styles.submit, { backgroundColor: mutation.isPending ? colors.muted : colors.primary }]}>{mutation.isPending ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={[styles.submitText, { color: colors.primaryForeground }]}>Publish review</Text>}</Pressable></ScrollView>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20 },
  header: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  kicker: { fontSize: 10, fontWeight: '800', letterSpacing: 1.4, marginTop: 30 },
  title: { fontSize: 28, fontWeight: '700', lineHeight: 34, marginTop: 7 },
  reference: { fontSize: 12, marginTop: 5 },
  label: { fontSize: 13, fontWeight: '800', marginTop: 30 },
  stars: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 22 },
  input: { minHeight: 50, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, fontSize: 13, marginBottom: 10 },
  textarea: { minHeight: 140, paddingTop: 14 },
  note: { fontSize: 12, lineHeight: 18, marginTop: 5 },
  error: { fontSize: 12, marginTop: 12 },
  submit: { minHeight: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  submitText: { fontSize: 13, fontWeight: '800' },
});