import React from 'react';
import { FlatList, View } from 'react-native';
import { useListHomeBanners } from '@workspace/api-client-react';
import { BannerCard } from '../components/Cards';
import { SectionContainer } from '../components/SectionContainer';

export function BannerSection() {
  const { data, isLoading, isError, refetch } = useListHomeBanners();

  return (
    <SectionContainer 
      title="Featured"
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
        renderItem={({ item }) => <BannerCard item={item} />}
      />
    </SectionContainer>
  );
}
