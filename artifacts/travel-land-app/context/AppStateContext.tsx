import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import {
  FavoriteEntityType,
  getListFavoritesQueryKey,
  useAddFavorite,
  useListFavorites,
  useRemoveFavorite,
  type FavoriteEntityType as FavoriteEntityTypeValue,
} from '@workspace/api-client-react';
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState as NativeAppState, Platform } from 'react-native';
import { destinations, properties, stays } from '@/lib/content';
import { useMobileAuth } from './AuthContext';

type PendingFavorite = {
  desired: boolean;
};

type AppState = {
  favoriteIds: string[];
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  isHydrated: boolean;
};

const FAVORITES_KEY = '@travel-land/favorites';
const USER_FAVORITES_PREFIX = '@travel-land/favorites/user/';
const PENDING_FAVORITES_PREFIX = '@travel-land/favorites/pending/';
const favoriteEntityTypes = new Set<FavoriteEntityTypeValue>(Object.values(FavoriteEntityType));
const AppStateContext = createContext<AppState | null>(null);

function userStorageKey(prefix: string, userId: string) {
  return `${prefix}${encodeURIComponent(userId)}`;
}

function favoriteKey(entityType: FavoriteEntityTypeValue, entityId: string) {
  return `${entityType}:${entityId}`;
}

const legacyTypeById: Record<string, FavoriteEntityTypeValue> = Object.fromEntries([
  ...destinations.map((item) => [item.id, 'destination']),
  ...properties.map((item) => [item.id, 'property']),
  ...stays.map((item) => [item.id, 'hotel']),
]) as Record<string, FavoriteEntityTypeValue>;

function normalizeFavoriteKey(value: unknown): string | null {
  if (typeof value !== 'string' || !value) return null;
  const separator = value.indexOf(':');
  if (separator > 0) {
    const entityType = value.slice(0, separator) as FavoriteEntityTypeValue;
    const entityId = value.slice(separator + 1);
    if (favoriteEntityTypes.has(entityType) && entityId) return favoriteKey(entityType, entityId);
  }
  const legacyType = legacyTypeById[value];
  return legacyType ? favoriteKey(legacyType, value) : value;
}

function parseFavoriteKey(value: string): { entityType: FavoriteEntityTypeValue; entityId: string } | null {
  const separator = value.indexOf(':');
  if (separator <= 0) return null;
  const entityType = value.slice(0, separator) as FavoriteEntityTypeValue;
  const entityId = value.slice(separator + 1);
  return favoriteEntityTypes.has(entityType) && entityId ? { entityType, entityId } : null;
}

function uniqueFavoriteKeys(values: readonly unknown[]): string[] {
  return [...new Set(values.map(normalizeFavoriteKey).filter((value): value is string => Boolean(value)))];
}

function applyPending(serverIds: string[], pending: Record<string, PendingFavorite>) {
  const merged = new Set(serverIds);
  Object.entries(pending).forEach(([key, operation]) => {
    if (operation.desired) merged.add(key);
    else merged.delete(key);
  });
  return [...merged];
}

function httpStatus(error: unknown) {
  if (!error || typeof error !== 'object' || !('status' in error)) return null;
  const status = (error as { status?: unknown }).status;
  return typeof status === 'number' ? status : null;
}

async function readStoredKeys(key: string): Promise<string[]> {
  try {
    const stored = await AsyncStorage.getItem(key);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed) ? uniqueFavoriteKeys(parsed) : [];
  } catch {
    return [];
  }
}

async function readPending(key: string): Promise<Record<string, PendingFavorite>> {
  try {
    const stored = await AsyncStorage.getItem(key);
    if (!stored) return {};
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return {};
    return Object.fromEntries(
      parsed
        .filter((item): item is { key: unknown; desired: unknown } => Boolean(item) && typeof item === 'object' && 'key' in item && 'desired' in item)
        .map((item) => [normalizeFavoriteKey(item.key), { desired: item.desired === true }])
        .filter(([key, value]) => Boolean(key) && parseFavoriteKey(key as string) && typeof (value as PendingFavorite).desired === 'boolean'),
    ) as Record<string, PendingFavorite>;
  } catch {
    return {};
  }
}

function persistKeys(key: string, values: string[]) {
  void AsyncStorage.setItem(key, JSON.stringify(values)).catch(() => undefined);
}

function persistPending(key: string, pending: Record<string, PendingFavorite>) {
  void AsyncStorage.setItem(
    key,
    JSON.stringify(Object.entries(pending).map(([favorite, operation]) => ({ key: favorite, desired: operation.desired }))),
  ).catch(() => undefined);
}

export function getFavoriteKey(entityType: FavoriteEntityTypeValue, entityId: string) {
  return favoriteKey(entityType, entityId);
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, userId } = useMobileAuth();
  const accountId = isSignedIn && userId ? userId : null;
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [legacyFavoriteIds, setLegacyFavoriteIds] = useState<string[]>([]);
  const [pendingOperations, setPendingOperations] = useState<Record<string, PendingFavorite>>({});
  const [isHydrated, setIsHydrated] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);
  const pendingRef = useRef(pendingOperations);
  const legacyRef = useRef(legacyFavoriteIds);
  const favoriteIdsRef = useRef(favoriteIds);
  pendingRef.current = pendingOperations;
  legacyRef.current = legacyFavoriteIds;
  favoriteIdsRef.current = favoriteIds;

  const favoritesQuery = useListFavorites({
    query: {
      enabled: Boolean(accountId) && isHydrated,
      queryKey: [...getListFavoritesQueryKey(), accountId ?? 'signed-out'],
      retry: 2,
      refetchOnReconnect: true,
    },
  });
  const addFavoriteMutation = useAddFavorite();
  const removeFavoriteMutation = useRemoveFavorite();

  useEffect(() => {
    if (!isLoaded) return;
    let active = true;
    setIsHydrated(false);
    setFavoriteIds([]);
    setLegacyFavoriteIds([]);
    setPendingOperations({});

    const legacyPromise = readStoredKeys(FAVORITES_KEY);
    const userPromise = accountId
      ? Promise.all([
        readStoredKeys(userStorageKey(USER_FAVORITES_PREFIX, accountId)),
        readPending(userStorageKey(PENDING_FAVORITES_PREFIX, accountId)),
      ])
      : Promise.resolve([[], {}] as const);

    void Promise.all([legacyPromise, userPromise]).then(([legacy, [userFavorites, pending]]) => {
      if (!active) return;
      const normalizedLegacy = uniqueFavoriteKeys(legacy);
      const normalizedUserFavorites = uniqueFavoriteKeys(userFavorites);
      setLegacyFavoriteIds(normalizedLegacy);
      setPendingOperations(pending);
      setFavoriteIds(accountId ? applyPending([...new Set([...normalizedUserFavorites, ...normalizedLegacy])], pending) : normalizedLegacy);
      setIsHydrated(true);
    });

    return () => {
      active = false;
    };
  }, [accountId, isLoaded]);

  useEffect(() => {
    if (!accountId || !isHydrated || !favoritesQuery.data) return;
    const serverIds = uniqueFavoriteKeys(
      favoritesQuery.data.items.map((item) => favoriteKey(item.entityType, item.entityId)),
    );
    const serverSet = new Set(serverIds);

    setLegacyFavoriteIds((current) => {
      const remaining = current.filter((key) => !serverSet.has(key));
      if (remaining.length !== current.length) persistKeys(FAVORITES_KEY, remaining);
      return remaining;
    });
    setPendingOperations((current) => {
      const next = { ...current };
      legacyRef.current.forEach((key) => {
        if (!serverSet.has(key)) next[key] ??= { desired: true };
      });
      persistPending(userStorageKey(PENDING_FAVORITES_PREFIX, accountId), next);
      return next;
    });
    setFavoriteIds((current) => {
      const pendingWithLegacy = { ...pendingRef.current };
      legacyRef.current.forEach((key) => {
        if (!serverSet.has(key)) pendingWithLegacy[key] ??= { desired: true };
      });
      const next = applyPending(serverIds, pendingWithLegacy);
      persistKeys(userStorageKey(USER_FAVORITES_PREFIX, accountId), next);
      return next;
    });
  }, [accountId, favoritesQuery.data, isHydrated]);

  useEffect(() => {
    if (!accountId || !isHydrated || !favoritesQuery.data || Object.keys(pendingOperations).length === 0) return;
    let active = true;
    const entries = Object.entries(pendingOperations);

    void (async () => {
      for (const [key, operation] of entries) {
        if (!active || pendingRef.current[key]?.desired !== operation.desired) continue;
        const parsed = parseFavoriteKey(key);
        if (!parsed) continue;
        try {
          if (operation.desired) {
            await addFavoriteMutation.mutateAsync(parsed);
          } else {
            await removeFavoriteMutation.mutateAsync(parsed);
          }
          if (!active) return;
          setPendingOperations((current) => {
            if (current[key]?.desired !== operation.desired) return current;
            const next = { ...current };
            delete next[key];
            persistPending(userStorageKey(PENDING_FAVORITES_PREFIX, accountId), next);
            return next;
          });
          if (operation.desired && legacyRef.current.includes(key)) {
            const remaining = legacyRef.current.filter((item) => item !== key);
            setLegacyFavoriteIds(remaining);
            persistKeys(FAVORITES_KEY, remaining);
          }
        } catch (error) {
          const status = httpStatus(error);
          const permanentFailure = status !== null && status >= 400 && status < 500 && ![408, 409, 429].includes(status);
          if (permanentFailure) {
            setPendingOperations((current) => {
              if (current[key]?.desired !== operation.desired) return current;
              const next = { ...current };
              delete next[key];
              persistPending(userStorageKey(PENDING_FAVORITES_PREFIX, accountId), next);
              return next;
            });
            if (operation.desired) {
              setFavoriteIds((current) => {
                const next = current.filter((item) => item !== key);
                persistKeys(userStorageKey(USER_FAVORITES_PREFIX, accountId), next);
                return next;
              });
            }
          }
          return;
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [accountId, favoritesQuery.data, isHydrated, pendingOperations]);

  useEffect(() => {
    if (!accountId || !isHydrated || Object.keys(pendingOperations).length === 0) return;
    const timer = setTimeout(() => {
      void favoritesQuery.refetch();
      setRetryNonce((value) => value + 1);
    }, 5000);
    return () => clearTimeout(timer);
  }, [accountId, favoritesQuery, isHydrated, pendingOperations, retryNonce]);

  useEffect(() => {
    const subscription = NativeAppState.addEventListener('change', (state) => {
      if (state === 'active' && accountId && isHydrated) {
        void favoritesQuery.refetch();
        setRetryNonce((value) => value + 1);
      }
    });
    return () => subscription.remove();
  }, [accountId, favoritesQuery, isHydrated]);

  const toggleFavorite = (id: string) => {
    const normalizedId = normalizeFavoriteKey(id) ?? id;
    const wasFavorite = favoriteIdsRef.current.includes(normalizedId);
    setFavoriteIds((current) => {
      const next = current.includes(normalizedId)
        ? current.filter((item) => item !== normalizedId)
        : [...current, normalizedId];
      if (accountId) persistKeys(userStorageKey(USER_FAVORITES_PREFIX, accountId), next);
      else persistKeys(FAVORITES_KEY, next);
      return next;
    });

    if (accountId && parseFavoriteKey(normalizedId)) {
      setPendingOperations((current) => {
        const next = { ...current, [normalizedId]: { desired: !wasFavorite } };
        persistPending(userStorageKey(PENDING_FAVORITES_PREFIX, accountId), next);
        return next;
      });
    }
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const value = useMemo(
    () => ({
      favoriteIds,
      toggleFavorite,
      isFavorite: (id: string) => favoriteIds.includes(normalizeFavoriteKey(id) ?? id),
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