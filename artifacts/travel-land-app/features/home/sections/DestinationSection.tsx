import React from 'react';
import { FlatList, View } from 'react-native';
import { router } from 'expo-router';
import { useListHomeDestinations } from '@workspace/api-client-react';
import { DestinationCard } from '../components/Cards';
import { SectionContainer } from '../components/SectionContainer';
import { useAppState } from '@/context/AppStateContext';

export function DestinationSection() {
  const { data, isLoading, isError, refetch } = useListHomeDestinations();
  const { isFavorite, toggleFavorite } = useAppState();

  return (
    <SectionContainer 
      title="Destinations"
      onViewAll={() => router.push({ pathname: '/(tabs)/explore', params: { filter: 'Destinations' } })}
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
          <DestinationCard 
            item={item} 
            isFavorite={isFavorite(`destination:${item.id}`)}
            toggleFavorite={() => toggleFavorite(`destination:${item.id}`)}
          />
        )}
      />
    </SectionContainer>
  );
}
