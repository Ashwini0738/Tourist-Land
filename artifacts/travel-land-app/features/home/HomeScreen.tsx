import React, { useCallback, useState } from 'react';
import { ScrollView, RefreshControl, Platform } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';

import { Header } from './components/Header';
import { WalletCard } from './components/WalletCard';
import { SearchBar } from './components/SearchBar';
import { QuickActions } from './components/QuickActions';
import { BannerSection } from './sections/BannerSection';
import { DestinationSection } from './sections/DestinationSection';
import { NearbySection } from './sections/NearbySection';
import { EventSection } from './sections/EventSection';
import { HotelSection } from './sections/HotelSection';
import { PropertySection } from './sections/PropertySection';
import {
  getListHomeBannersQueryKey,
  getListHomeDestinationsQueryKey,
  getListHomeNearbyQueryKey,
  getListHomeEventsQueryKey,
  getListHomeHotelsQueryKey,
  getListHomePropertiesQueryKey,
} from '@workspace/api-client-react';

export function HomeScreen() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getListHomeBannersQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getListHomeDestinationsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getListHomeNearbyQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getListHomeEventsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getListHomeHotelsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getListHomePropertiesQueryKey() }),
    ]);
    setRefreshing(false);
  }, [queryClient]);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: Platform.OS === 'web' ? 102 : 118 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <Header />
      <WalletCard />
      <SearchBar />
      <QuickActions />
      
      <BannerSection />
      <DestinationSection />
      <HotelSection />
      <NearbySection />
      <EventSection />
      <PropertySection />
    </ScrollView>
  );
}
