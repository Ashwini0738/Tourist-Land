import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { ExploreItem, ExploreItemType } from '@workspace/api-client-react';
import { PlatformIcon as Feather } from '@/components/PlatformIcon';
import { useColors } from '@/hooks/useColors';
import { getImageSource } from '@/features/home/utils/images';
import { elevation, radii, spacing } from '@/constants/theme';

type ExploreCardProps = {
  item: ExploreItem;
  isFavorite: boolean;
  toggleFavorite: () => void;
  horizontal?: boolean;
};

export function getExploreRoute(type: ExploreItemType, id: string) {
  if (type === 'destination') return `/destination/${id}`;
  if (type === 'place' || type === 'temple' || type === 'attraction') return `/place/${id}`;
  if (type === 'event') return `/event/${id}`;
  if (type === 'food') return `/food/${id}`;
  if (type === 'hotel') return `/hotel/${id}`;
  return `/property/${id}`;
}

function ExploreCard({ item, isFavorite, toggleFavorite, horizontal = false }: ExploreCardProps) {
  const colors = useColors();
  const metadata = item.type === 'hotel'
    ? item.availability?.status === 'unavailable'
      ? 'Currently unavailable'
      : item.availability?.priceLabel ?? item.priceLabel ?? item.ratingLabel
    : item.type === 'event'
      ? item.schedule?.status === 'cancelled'
        ? item.schedule.dateLabel ?? 'Cancelled'
        : item.schedule?.status === 'unavailable'
          ? 'Schedule unavailable'
          : item.schedule?.dateLabel ?? item.dateLabel
      : item.dateLabel ?? item.priceLabel ?? item.ratingLabel;
  const kindLabel = item.type === 'property' ? item.propertyType ?? 'Land opportunity' : item.category;
  const route = getExploreRoute(item.type, item.id);
  const openItem = () => {
    if (item.type === 'destination' || item.type === 'hotel' || item.type === 'property') {
      router.push(route as any);
      return;
    }
    router.push({
      pathname: route as any,
      params: {
        id: item.id,
        type: item.type,
        title: item.title,
        location: item.location,
        category: item.category,
        summary: item.summary,
        imageKey: item.imageKey,
        dateLabel: item.dateLabel,
        favoriteId: favoriteKey(item),
      },
    } as any);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${item.title}`}
      onPress={openItem}
      style={[
        styles.card,
        horizontal ? styles.horizontalCard : styles.verticalCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Image source={getImageSource(item.imageKey)} style={[styles.image, horizontal ? styles.horizontalImage : styles.verticalImage]} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${isFavorite ? 'Remove' : 'Add'} ${item.title} ${isFavorite ? 'from' : 'to'} favorites`}
        onPress={(event) => {
          event.stopPropagation();
          toggleFavorite();
        }}
        style={[styles.favorite, { backgroundColor: 'rgba(16,45,58,0.72)' }]}
      >
        <Feather name="heart" size={16} color={isFavorite ? colors.destructive : '#fff'} fill={isFavorite ? colors.destructive : 'transparent'} />
      </Pressable>
      <View style={styles.copy}>
        <Text style={[styles.type, { color: colors.primary }]} numberOfLines={1}>{kindLabel.toUpperCase()}</Text>
        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={2}>{item.title}</Text>
        <Text style={[styles.location, { color: colors.mutedForeground }]} numberOfLines={1}>{item.location}</Text>
        {metadata ? <Text style={[styles.metadata, { color: colors.mutedForeground }]} numberOfLines={1}>{metadata}</Text> : null}
        <Text style={[styles.source, { color: item.source === 'live' ? colors.primary : item.source === 'unavailable' ? colors.destructive : colors.mutedForeground }]} numberOfLines={1}>{item.sourceLabel}</Text>
      </View>
      {!horizontal ? <Feather name="arrow-up-right" size={17} color={colors.foreground} /> : null}
    </Pressable>
  );
}

function favoriteKey(item: ExploreItem) {
  return ['destination', 'hotel', 'property'].includes(item.type) ? item.id : `${item.type}:${item.id}`;
}

export function DestinationCard(props: ExploreCardProps) {
  return <ExploreCard {...props} horizontal />;
}

export function PlaceCard(props: ExploreCardProps) {
  return <ExploreCard {...props} horizontal />;
}

export function EventCard(props: ExploreCardProps) {
  return <ExploreCard {...props} horizontal />;
}

export function FoodCard(props: ExploreCardProps) {
  return <ExploreCard {...props} horizontal />;
}

export function HotelCard(props: ExploreCardProps) {
  return <ExploreCard {...props} horizontal />;
}

export function PropertyCard(props: ExploreCardProps) {
  return <ExploreCard {...props} horizontal />;
}

export function ExploreResultCard(props: ExploreCardProps) {
  return <ExploreCard {...props} />;
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radii.lg,
    overflow: 'hidden',
    position: 'relative',
    ...elevation.card,
  },
  horizontalCard: {
    width: 236,
    minHeight: 272,
  },
  verticalCard: {
    minHeight: 132,
    flexDirection: 'row',
    padding: spacing.sm,
    alignItems: 'center',
  },
  image: {
    backgroundColor: '#d9ded7',
  },
  horizontalImage: {
    width: '100%',
    height: 142,
  },
  verticalImage: {
    width: 106,
    height: 106,
    borderRadius: 13,
  },
  favorite: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 12,
    right: 12,
  },
  copy: {
    flex: 1,
    padding: spacing.md,
  },
  type: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginBottom: 5,
  },
  title: {
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '700',
  },
  location: {
    fontSize: 12,
    marginTop: 5,
  },
  metadata: {
    fontSize: 11,
    marginTop: 7,
  },
  source: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.7,
    marginTop: 7,
  },
});