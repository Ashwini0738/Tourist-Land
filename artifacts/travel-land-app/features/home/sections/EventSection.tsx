import React from 'react';
import { FlatList } from 'react-native';
import { useListHomeEvents } from '@workspace/api-client-react';
import { EventCard } from '../components/Cards2';
import { SectionContainer } from '../components/SectionContainer';

export function EventSection() {
  const { data, isLoading, isError, refetch } = useListHomeEvents();

  return (
    <SectionContainer 
      title="Upcoming Events"
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
        renderItem={({ item }) => <EventCard item={item} />}
      />
    </SectionContainer>
  );
}
