import React from 'react';
import { FlatList } from 'react-native';
import { router } from 'expo-router';
import { useListHomeHotels } from '@workspace/api-client-react';
import { HotelCard } from '../components/Cards2';
import { SectionContainer } from '../components/SectionContainer';
import { useAppState } from '@/context/AppStateContext';

export function HotelSection() {
  const { data, isLoading, isError, refetch } = useListHomeHotels();
  const { isFavorite, toggleFavorite } = useAppState();

  return (
    <SectionContainer 
      title="Sample Stays"
      onViewAll={() => router.push('/hotels')}
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
        renderItem={({ item }) => (
          <HotelCard 
            item={item} 
            isFavorite={isFavorite(item.id)}
            toggleFavorite={() => toggleFavorite(item.id)}
          />
        )}
      />
    </SectionContainer>
  );
}
