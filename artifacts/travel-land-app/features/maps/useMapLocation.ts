import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';

export type MapPermission = 'unknown' | 'granted' | 'denied' | 'blocked';
export type MapLocationError =
  | 'permission-denied'
  | 'permission-blocked'
  | 'gps-disabled'
  | 'unavailable';

export type MapLocation = {
  latitude: number;
  longitude: number;
  accuracy?: number;
  name?: string;
};

function errorFromMessage(error: unknown): MapLocationError {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return /gps|location service|provider|disabled/.test(message) ? 'gps-disabled' : 'unavailable';
}

export function useMapLocation() {
  const [permission, setPermission] = useState<MapPermission>('unknown');
  const [location, setLocation] = useState<MapLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<MapLocationError | null>(null);

  useEffect(() => {
    let active = true;
    void Location.getForegroundPermissionsAsync()
      .then((response) => {
        if (!active) return;
        setPermission(response.status === 'granted' ? 'granted' : response.canAskAgain === false ? 'blocked' : 'denied');
      })
      .catch(() => {
        if (active) setPermission('unknown');
      });
    return () => {
      active = false;
    };
  }, []);

  const requestLocation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await Location.requestForegroundPermissionsAsync();
      if (response.status !== 'granted') {
        const nextPermission = response.canAskAgain === false ? 'blocked' : 'denied';
        setPermission(nextPermission);
        setError(nextPermission === 'blocked' ? 'permission-blocked' : 'permission-denied');
        return;
      }

      setPermission('granted');
      if (typeof Location.hasServicesEnabledAsync === 'function' && !(await Location.hasServicesEnabledAsync())) {
        setError('gps-disabled');
        return;
      }

      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const nextLocation: MapLocation = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
        ...(current.coords.accuracy === null ? {} : { accuracy: current.coords.accuracy }),
      };
      try {
        const places = await Location.reverseGeocodeAsync({
          latitude: nextLocation.latitude,
          longitude: nextLocation.longitude,
        });
        const place = places[0];
        const name = place ? [place.city || place.region, place.country].filter(Boolean).join(', ') : undefined;
        if (name) nextLocation.name = name;
      } catch {
        // Coordinates are still useful when reverse geocoding is unavailable.
      }
      setLocation(nextLocation);
    } catch (caught) {
      setError(errorFromMessage(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  return { permission, location, loading, error, requestLocation };
}

export function getMapLocationMessage(permission: MapPermission, error: MapLocationError | null) {
  if (error === 'gps-disabled') return 'Location services are turned off. You can still explore manually.';
  if (error === 'permission-blocked' || permission === 'blocked') return 'Location access is blocked. Enable it in device settings, or keep exploring manually.';
  if (error === 'permission-denied' || permission === 'denied') return 'Location access was declined. Search and browse still work without it.';
  if (error === 'unavailable') return 'Your location is unavailable right now. Search and browse still work without it.';
  return null;
}