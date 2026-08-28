import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

type AppState = {
  favoriteIds: string[];
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  isHydrated: boolean;
};

const FAVORITES_KEY = '@travel-land/favorites';
const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(FAVORITES_KEY)
      .then((stored) => {
        if (stored) setFavoriteIds(JSON.parse(stored) as string[]);
      })
      .catch(() => undefined)
      .finally(() => setIsHydrated(true));
  }, []);

  const toggleFavorite = (id: string) => {
    setFavoriteIds((current) => {
      const next = current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id];
      AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(next)).catch(() => undefined);
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return next;
    });
  };

  const value = useMemo(
    () => ({
      favoriteIds,
      toggleFavorite,
      isFavorite: (id: string) => favoriteIds.includes(id),
      isHydrated,
    }),
    [favoriteIds, isHydrated],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const value = useContext(AppStateContext);
  if (!value) throw new Error('useAppState must be used inside AppStateProvider');
  return value;
}