import { Linking, Platform } from 'react-native';

type MapDestination = {
  title: string;
  latitude: number;
  longitude: number;
};

export function getDirectionsUrl({ latitude, longitude }: MapDestination) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${latitude},${longitude}`)}`;
}

export async function openDirections(destination: MapDestination): Promise<boolean> {
  const url = getDirectionsUrl(destination);
  try {
    if (Platform.OS === 'web') {
      const opened = globalThis.window?.open(url, '_blank', 'noopener,noreferrer');
      return Boolean(opened);
    }
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}