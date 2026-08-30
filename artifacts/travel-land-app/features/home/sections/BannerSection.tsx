import React from 'react';
import { FlatList, Image, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useListHomeFeatured, type FeaturedContentItem } from '@workspace/api-client-react';
import { PlatformIcon as Feather } from '@/components/PlatformIcon';
import { useColors } from '@/hooks/useColors';
import { useAppState } from '@/context/AppStateContext';
import { getImageSource } from '../utils/images';
import { SectionContainer } from '../components/SectionContainer';

const FEATURED_CONTENT_UNAVAILABLE = 'FEATURED_CONTENT_UNAVAILABLE';

const labels: Record<FeaturedContentItem['entityType'], string> = {
  destination: 'Destination',
  hotel: 'Hotel',
  event: 'Event',
  offer: 'Offer',
};

function FeaturedCard({ item, isFavorite, toggleFavorite }: {
  item: FeaturedContentItem;
  isFavorite: boolean;
  toggleFavorite: () => void;
}) {
  const colors = useColors();

  const openItem = () => {
    if (item.entityType === 'destination') {
      router.push(`/destination/${item.entityId}`);
    } else if (item.entityType === 'hotel') {
      router.push(`/hotel/${item.entityId}`);
    } else if (item.destinationId) {
      router.push(`/destination/${item.destinationId}`);
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View featured ${labels[item.entityType]} ${item.title}`}
      onPress={openItem}
      style={{ width: 280, borderRadius: 20, overflow: 'hidden', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}
    >
      <Image source={getImageSource(item.imageKey)} style={{ width: '100%', height: 140 }} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${isFavorite ? 'Remove' : 'Add'} ${item.title} ${isFavorite ? 'from' : 'to'} favorites`}
        onPress={(event) => { event.stopPropagation(); toggleFavorite(); }}
        style={{ position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' }}
      >
        <Feather name="heart" size={16} color={isFavorite ? colors.destructive : '#fff'} fill={isFavorite ? colors.destructive : 'transparent'} />
      </Pressable>
      <View style={{ padding: 12 }}>
        <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>
          {labels[item.entityType]}
        </Text>
        <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: '700', marginTop: 4 }} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 3 }} numberOfLines={1}>
          {item.location || item.subtitle}
        </Text>
        <Text style={{ color: colors.foreground, fontSize: 13, marginTop: 8 }} numberOfLines={2}>
          {item.summary}
        </Text>
        {(item.dateLabel || item.priceLabel) && (
          <Text style={{ color: colors.mutedForeground, fontSize: 12, fontWeight: '600', marginTop: 10 }} numberOfLines={1}>
            {item.dateLabel ?? item.priceLabel}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

export function BannerSection() {
  const { data, error, isLoading, isError, refetch } = useListHomeFeatured();
  const { isFavorite, toggleFavorite } = useAppState();
  const isFeaturedContentUnavailable =
    error?.status === 503 &&
    error.data?.error?.code === FEATURED_CONTENT_UNAVAILABLE;

  return (
    <SectionContainer 
      title="Featured for you"
      isLoading={isLoading}
      isError={isError}
      isEmpty={!data?.items?.length}
      onRetry={refetch}
      emptyMessage="No featured content is available right now."
      errorMessage={
        isFeaturedContentUnavailable
          ? 'Featured content is temporarily unavailable.'
          : undefined
      }
    >
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}
        data={data?.items || []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <FeaturedCard
            item={item}
            isFavorite={isFavorite(`${item.entityType}:${item.entityId}`)}
            toggleFavorite={() => toggleFavorite(`${item.entityType}:${item.entityId}`)}
          />
        )}
      />
    </SectionContainer>
  );
}
