import * as Location from 'expo-location';
import { useEffect, useState, useCallback } from 'react';

export function useHomeLocation() {
  const [locationName, setLocationName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  const fetchLocation = useCallback(async () => {
    setLoading(true);
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const geocode = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      if (geocode.length > 0) {
        const place = geocode[0];
        setLocationName(`${place.city || place.region}, ${place.country}`);
      } else {
        setLocationName('Unknown location');
      }
    } catch (e) {
      setLocationName(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          setHasPermission(true);
          await fetchLocation();
        }
      } catch (e) {
        // ignore
      }
    })();
  }, [fetchLocation]);

  const requestPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setHasPermission(true);
        await fetchLocation();
      }
    } catch (e) {
      // ignore
    }
  };

  return { locationName, loading, hasPermission, requestPermission };
}
