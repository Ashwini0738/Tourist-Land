import React from 'react';
import { FlatList } from 'react-native';
import { router } from 'expo-router';
import { useListHomeProperties } from '@workspace/api-client-react';
import { PropertyCard } from '../components/Cards2';
import { SectionContainer } from '../components/SectionContainer';
import { useAppState } from '@/context/AppStateContext';

export function PropertySection() {
  const { data, isLoading, isError, refetch } = useListHomeProperties();
  const { isFavorite, toggleFavorite } = useAppState();

  return (
    <SectionContainer 
      title="Land Opportunities"
      onViewAll={() => router.push('/(tabs)/land')}
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
          <PropertyCard 
            item={item} 
            isFavorite={isFavorite(item.id)}
            toggleFavorite={() => toggleFavorite(item.id)}
          />
        )}
      />
    </SectionContainer>
  );
}
