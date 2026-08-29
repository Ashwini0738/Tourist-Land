import React from 'react';
import { FlatList } from 'react-native';
import { useListHomeNearby } from '@workspace/api-client-react';
import { PlaceCard } from '../components/Cards';
import { SectionContainer } from '../components/SectionContainer';
import { useAppState } from '@/context/AppStateContext';

export function NearbySection() {
  const { data, isLoading, isError, refetch } = useListHomeNearby();
  const { isFavorite, toggleFavorite } = useAppState();

  return (
    <SectionContainer 
      title="Popular places"
      isLoading={isLoading}
      isError={isError}
      isEmpty={!data?.items?.length}
      onRetry={refetch}
    >
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}
        data={data?.items || []}
        keyExtractor={(item) => item.id}
         renderItem={({ item }) => <PlaceCard item={item} isFavorite={isFavorite(`place:${item.id}`)} toggleFavorite={() => toggleFavorite(`place:${item.id}`)} />}
      />
    </SectionContainer>
  );
}
