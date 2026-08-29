import { PlatformIcon } from '@/components/PlatformIcon';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useColors } from '@/hooks/useColors';
import {
  useArchiveVendorListing,
  useCreateVendorListing,
  useListVendorListings,
  usePublishVendorListing,
  useUpdateVendorListing,
} from '@workspace/api-client-react';
import type { Listing, ListingInput, ListingUpdate } from '@workspace/api-client-react';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRole } from '@/context/RoleContext';

type ListingForm = {
  name: string;
  description: string;
  address: string;
  destinationId: string;
};

const EMPTY_FORM: ListingForm = {
  name: '',
  description: '',
  address: '',
  destinationId: '',
};

function errorMessage(error: unknown, fallback: string) {
  const value = error as { message?: string; error?: { message?: string } } | null;
  return value?.error?.message || value?.message || fallback;
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently updated';
  return `Updated ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

function statusLabel(status: Listing['status']) {
  return status === 'pending' ? 'Under review' : status.charAt(0).toUpperCase() + status.slice(1);
}

export default function VendorListingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { role } = useRole();
  const isAdminViewer = role === 'admin';
  const listings = useListVendorListings();
  const createListing = useCreateVendorListing();
  const updateListing = useUpdateVendorListing();
  const publishListing = usePublishVendorListing();
  const archiveListing = useArchiveVendorListing();
  const [form, setForm] = useState<ListingForm>(EMPTY_FORM);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');

  const items = listings.data?.items ?? [];
  const isFormPending =
    createListing.isPending || updateListing.isPending;
  const isActionPending =
    publishListing.isPending || archiveListing.isPending;

  const openCreate = () => {
    setFormOpen(true);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setActionMessage('');
    setActionError('');
  };

  const openEdit = (listing: Listing) => {
    setFormOpen(true);
    setEditingId(listing.id);
    setForm({
      name: listing.name,
      description: listing.description ?? '',
      address: listing.address,
      destinationId: listing.destinationId ?? '',
    });
    setFormError('');
    setActionMessage('');
    setActionError('');
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
  };

  const updateForm = (key: keyof ListingForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFormError('');
    setActionError('');
  };

  const saveListing = async () => {
    const name = form.name.trim();
    const description = form.description.trim();
    const address = form.address.trim();
    const destinationId = form.destinationId.trim();

    if (!name) {
      setFormError('Add a listing name so guests can recognise this place.');
      return;
    }
    if (!address) {
      setFormError('Add the property address before saving.');
      return;
    }

    setFormError('');
    setActionMessage('');
    setActionError('');
    try {
      if (editingId) {
        const current = items.find((item) => item.id === editingId);
        if (!current) {
          setFormError('This listing is no longer available. Refresh and try again.');
          return;
        }
        const data: ListingUpdate = {};
        if (name !== current.name) data.name = name;
        if (description !== (current.description ?? '')) data.description = description || null;
        if (address !== current.address) data.address = address;
        if (destinationId !== (current.destinationId ?? '')) data.destinationId = destinationId || null;
        if (Object.keys(data).length === 0) {
          setFormError('Make a change before saving this listing.');
          return;
        }
        await updateListing.mutateAsync({ id: editingId, data });
        setActionMessage('Listing changes saved.');
      } else {
        const data: ListingInput = {
          name,
          description: description || null,
          address,
          destinationId: destinationId || null,
        };
        await createListing.mutateAsync({ data });
        setActionMessage('Draft listing created.');
      }
      closeForm();
      await listings.refetch();
    } catch (error) {
      setActionError(errorMessage(error, 'The listing could not be saved. Try again.'));
    }
  };

  const publish = async (listing: Listing) => {
    setActionMessage('');
    setActionError('');
    try {
      await publishListing.mutateAsync({ id: listing.id });
      setActionMessage(`${listing.name} is now published.`);
      await listings.refetch();
    } catch (error) {
      setActionError(errorMessage(error, 'This listing could not be published. Try again.'));
    }
  };

  const archive = (listing: Listing) => {
    Alert.alert(
      'Archive this listing?',
      'It will no longer be visible to guests. You can keep its details for your records.',
      [
        { text: 'Keep listing', style: 'cancel' },
        {
          text: 'Archive listing',
          style: 'destructive',
          onPress: async () => {
            setActionMessage('');
            setActionError('');
            try {
              await archiveListing.mutateAsync({ id: listing.id });
              setActionMessage(`${listing.name} has been archived.`);
              await listings.refetch();
            } catch (error) {
              setActionError(errorMessage(error, 'This listing could not be archived. Try again.'));
            }
          },
        },
      ],
    );
  };

  const renderStatus = (status: Listing['status']) => {
    const palette: Record<Listing['status'], { background: string; foreground: string }> = {
      draft: { background: colors.muted, foreground: colors.mutedForeground },
      published: { background: colors.secondary, foreground: colors.primary },
      archived: { background: colors.muted, foreground: colors.mutedForeground },
      pending: { background: `${colors.accent}40`, foreground: colors.accentForeground },
    };
    const tone = palette[status];
    return (
      <View style={[styles.statusPill, { backgroundColor: tone.background }]}>
        <View style={[styles.statusDot, { backgroundColor: tone.foreground }]} />
        <Text style={[styles.statusText, { color: tone.foreground }]}>{statusLabel(status)}</Text>
      </View>
    );
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 34 },
      ]}
      bottomOffset={76}
      refreshControl={
        <RefreshControl
          refreshing={listings.isFetching && !listings.isLoading}
          onRefresh={() => listings.refetch()}
          tintColor={colors.primary}
        />
      }
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to vendor dashboard"
        onPress={() => router.replace('/vendor')}
        style={styles.back}
      >
        <PlatformIcon name="arrow-left" size={19} color={colors.foreground} />
        <Text style={[styles.backText, { color: colors.foreground }]}>Dashboard</Text>
      </Pressable>

      <Text style={[styles.kicker, { color: colors.primary }]}>VENDOR WORKSPACE</Text>
      <Text style={[styles.title, { color: colors.foreground }]}>Your places, ready\nto be found.</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        Keep each stay or parcel accurate, current, and ready for the right traveller.
      </Text>

      <View style={[styles.summaryCard, { backgroundColor: colors.primary }]}>
        <View style={[styles.summaryIcon, { backgroundColor: colors.accent }]}>
          <PlatformIcon name="layers" size={21} color={colors.accentForeground} />
        </View>
        <View style={styles.summaryCopy}>
            <Text style={styles.summaryLabel}>{isAdminViewer ? 'ALL VENDOR LISTINGS' : 'YOUR LISTINGS'}</Text>
          <Text style={styles.summaryValue}>{items.length} {items.length === 1 ? 'place' : 'places'}</Text>
        </View>
          {!isAdminViewer && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add a new listing"
              onPress={openCreate}
              style={[styles.addButton, { backgroundColor: colors.accent }]}
            >
              <PlatformIcon name="plus" size={17} color={colors.accentForeground} />
              <Text style={[styles.addButtonText, { color: colors.accentForeground }]}>Add listing</Text>
            </Pressable>
          )}
      </View>

      {!!actionMessage && (
        <View style={[styles.feedback, { backgroundColor: colors.secondary }]}>
          <PlatformIcon name="check-circle" size={17} color={colors.primary} />
          <Text style={[styles.feedbackText, { color: colors.primary }]}>{actionMessage}</Text>
        </View>
      )}
      {!!actionError && (
        <View style={[styles.feedback, { backgroundColor: `${colors.destructive}12` }]}>
          <PlatformIcon name="alert-circle" size={17} color={colors.destructive} />
          <Text style={[styles.feedbackText, { color: colors.destructive }]}>{actionError}</Text>
        </View>
      )}

      {formOpen && !isAdminViewer && (
        <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.formHeading}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.formKicker, { color: colors.primary }]}>
                {editingId ? 'EDIT LISTING' : 'NEW LISTING'}
              </Text>
              <Text style={[styles.formTitle, { color: colors.foreground }]}>
                {editingId ? 'Keep the details current.' : 'Start with the essentials.'}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close listing form"
              onPress={closeForm}
              style={[styles.closeButton, { backgroundColor: colors.secondary }]}
            >
              <PlatformIcon name="x" size={17} color={colors.foreground} />
            </Pressable>
          </View>
          <Field
            label="Listing name"
            value={form.name}
            onChangeText={(value) => updateForm('name', value)}
            placeholder="e.g. Cedar House Retreat"
            colors={colors}
            required
          />
          <Field
            label="Address"
            value={form.address}
            onChangeText={(value) => updateForm('address', value)}
            placeholder="Street, town, country"
            colors={colors}
            required
          />
          <Field
            label="Description"
            value={form.description}
            onChangeText={(value) => updateForm('description', value)}
            placeholder="What should guests know about this place?"
            colors={colors}
            multiline
          />
          <Field
            label="Destination ID"
            value={form.destinationId}
            onChangeText={(value) => updateForm('destinationId', value)}
            placeholder="Optional destination reference"
            colors={colors}
            autoCapitalize="none"
          />
          {!!formError && <Text style={[styles.formError, { color: colors.destructive }]}>{formError}</Text>}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={editingId ? 'Save listing changes' : 'Create draft listing'}
            disabled={isFormPending}
            onPress={saveListing}
            style={[styles.primaryButton, { backgroundColor: isFormPending ? colors.mutedForeground : colors.primary }]}
          >
            <Text style={styles.primaryButtonText}>
              {isFormPending ? 'Saving listing…' : editingId ? 'Save changes' : 'Create draft'}
            </Text>
            {!isFormPending && <PlatformIcon name="arrow-right" size={17} color={colors.primaryForeground} />}
          </Pressable>
        </View>
      )}

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>LISTINGS</Text>
        {items.length > 0 && <Text style={[styles.sectionCount, { color: colors.mutedForeground }]}>{items.length} total</Text>}
      </View>

      {listings.isLoading ? (
        <ListingSkeleton colors={colors} />
      ) : listings.isError ? (
        <StateCard
          icon="alert-circle"
          title="Listings are unavailable"
          description="We could not load your workspace. Check your connection and try again."
          buttonLabel="Try again"
          onPress={() => listings.refetch()}
          colors={colors}
        />
      ) : items.length === 0 ? (
        <StateCard
          icon="box"
          title={isAdminViewer ? 'No vendor listings yet' : 'Your workspace is ready'}
          description={isAdminViewer ? 'Approved vendor places will appear here for review.' : 'Add your first stay or property and keep the details in one protected place.'}
          buttonLabel={isAdminViewer ? undefined : 'Add your first listing'}
          onPress={isAdminViewer ? undefined : openCreate}
          colors={colors}
        />
      ) : (
        items.map((listing) => (
          <View key={listing.id} style={[styles.listingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardTop}>
              <View style={styles.cardTitleCopy}>
                <Text style={[styles.listingName, { color: colors.foreground }]}>{listing.name}</Text>
                <View style={styles.locationLine}>
                  <PlatformIcon name="map-pin" size={13} color={colors.mutedForeground} />
                  <Text numberOfLines={1} style={[styles.locationText, { color: colors.mutedForeground }]}>{listing.address}</Text>
                </View>
              </View>
              {renderStatus(listing.status)}
            </View>
            {!!listing.description && (
              <Text numberOfLines={2} style={[styles.description, { color: colors.mutedForeground }]}>
                {listing.description}
              </Text>
            )}
            <Text style={[styles.updated, { color: colors.mutedForeground }]}>{formatUpdatedAt(listing.updatedAt)}</Text>
            {!isAdminViewer && <View style={[styles.cardActions, { borderTopColor: colors.border }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Edit ${listing.name}`}
                onPress={() => openEdit(listing)}
                style={[styles.secondaryButton, { borderColor: colors.input }]}
              >
                <PlatformIcon name="sliders" size={15} color={colors.foreground} />
                <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>Edit</Text>
              </Pressable>
              {listing.status === 'draft' && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Publish ${listing.name}`}
                  disabled={isActionPending}
                  onPress={() => publish(listing)}
                  style={[styles.actionButton, { backgroundColor: isActionPending ? colors.muted : colors.secondary }]}
                >
                  <PlatformIcon name="check" size={15} color={colors.primary} />
                  <Text style={[styles.actionButtonText, { color: colors.primary }]}>
                    {publishListing.isPending ? 'Publishing…' : 'Publish'}
                  </Text>
                </Pressable>
              )}
              {listing.status === 'published' && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Archive ${listing.name}`}
                  disabled={isActionPending}
                  onPress={() => archive(listing)}
                  style={[styles.actionButton, { backgroundColor: `${colors.destructive}10` }]}
                >
                  <PlatformIcon name="box" size={15} color={colors.destructive} />
                  <Text style={[styles.actionButtonText, { color: colors.destructive }]}>
                    {archiveListing.isPending ? 'Archiving…' : 'Archive'}
                  </Text>
                </Pressable>
              )}
              {listing.status === 'pending' && (
                <View style={[styles.reviewNote, { backgroundColor: `${colors.accent}30` }]}>
                  <PlatformIcon name="clock" size={14} color={colors.accentForeground} />
                  <Text style={[styles.reviewNoteText, { color: colors.accentForeground }]}>Review in progress</Text>
                </View>
              )}
              {listing.status === 'archived' && (
                <View style={[styles.reviewNote, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.reviewNoteText, { color: colors.mutedForeground }]}>Archived</Text>
                </View>
              )}
            </View>}
          </View>
        ))
      )}
    </KeyboardAwareScrollViewCompat>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  colors,
  required,
  multiline,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  colors: ReturnType<typeof useColors>;
  required?: boolean;
  multiline?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
        {label}{required ? <Text style={{ color: colors.destructive }}> *</Text> : null}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        multiline={multiline}
        autoCapitalize={autoCapitalize}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[
          styles.input,
          multiline && styles.textarea,
          { backgroundColor: colors.background, borderColor: colors.input, color: colors.foreground },
        ]}
      />
    </View>
  );
}

function StateCard({
  icon,
  title,
  description,
  buttonLabel,
  onPress,
  colors,
}: {
  icon: string;
  title: string;
  description: string;
  buttonLabel?: string;
  onPress?: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.stateCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.stateIcon, { backgroundColor: colors.secondary }]}>
        <PlatformIcon name={icon} size={21} color={colors.primary} />
      </View>
      <Text style={[styles.stateTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.stateDescription, { color: colors.mutedForeground }]}>{description}</Text>
      {buttonLabel && onPress && (
        <Pressable onPress={onPress} accessibilityRole="button" style={[styles.stateButton, { backgroundColor: colors.primary }]}>
          <Text style={styles.primaryButtonText}>{buttonLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

function ListingSkeleton({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.skeletonGroup}>
      {[1, 2].map((item) => (
        <View key={item} style={[styles.listingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.skeletonLine, { backgroundColor: colors.muted, width: '54%' }]} />
          <View style={[styles.skeletonLine, { backgroundColor: colors.muted, width: '78%', marginTop: 13 }]} />
          <View style={[styles.skeletonLine, { backgroundColor: colors.muted, width: '34%', marginTop: 18 }]} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 27 },
  backText: { fontSize: 14, fontWeight: '700' },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.8 },
  subtitle: { fontSize: 14, lineHeight: 21, marginTop: 12, marginBottom: 22 },
  summaryCard: { borderRadius: 21, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 21 },
  summaryIcon: { width: 45, height: 45, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  summaryCopy: { flex: 1, marginLeft: 12 },
  summaryLabel: { color: 'rgba(255,255,255,0.68)', fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  summaryValue: { color: '#fff', fontSize: 19, fontWeight: '700', marginTop: 3 },
  addButton: { minHeight: 40, paddingHorizontal: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  addButtonText: { fontSize: 12, fontWeight: '800' },
  feedback: { borderRadius: 13, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 14 },
  feedbackText: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: '600' },
  formCard: { borderWidth: 1, borderRadius: 20, padding: 16, marginBottom: 24 },
  formHeading: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 17 },
  formKicker: { fontSize: 10, letterSpacing: 1.2, fontWeight: '800', marginBottom: 4 },
  formTitle: { fontSize: 17, fontWeight: '700' },
  closeButton: { width: 32, height: 32, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  field: { marginBottom: 13 },
  fieldLabel: { fontSize: 12, fontWeight: '700', marginBottom: 7 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 13, paddingHorizontal: 13, fontSize: 14 },
  textarea: { minHeight: 84, paddingTop: 12, paddingBottom: 12 },
  formError: { fontSize: 12, lineHeight: 17, marginBottom: 12 },
  primaryButton: { minHeight: 49, borderRadius: 13, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  primaryButtonText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.3 },
  sectionCount: { fontSize: 11 },
  listingCard: { borderWidth: 1, borderRadius: 19, padding: 15, marginBottom: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardTitleCopy: { flex: 1 },
  listingName: { fontSize: 16, lineHeight: 21, fontWeight: '800' },
  locationLine: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 7 },
  locationText: { flex: 1, fontSize: 11 },
  statusPill: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '800' },
  description: { fontSize: 12, lineHeight: 18, marginTop: 14 },
  updated: { fontSize: 10, marginTop: 12 },
  cardActions: { borderTopWidth: 1, marginTop: 14, paddingTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  secondaryButton: { minHeight: 36, paddingHorizontal: 11, borderRadius: 10, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  secondaryButtonText: { fontSize: 11, fontWeight: '800' },
  actionButton: { minHeight: 36, paddingHorizontal: 11, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionButtonText: { fontSize: 11, fontWeight: '800' },
  reviewNote: { minHeight: 36, borderRadius: 10, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  reviewNoteText: { fontSize: 10, fontWeight: '800' },
  stateCard: { borderWidth: 1, borderRadius: 20, padding: 24, alignItems: 'center' },
  stateIcon: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  stateTitle: { fontSize: 16, fontWeight: '800', marginTop: 14 },
  stateDescription: { fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 7 },
  stateButton: { minHeight: 44, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  skeletonGroup: { opacity: 0.85 },
  skeletonLine: { height: 12, borderRadius: 6 },
});
