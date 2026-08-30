import { Linking, Platform } from 'react-native';

type MapDestination = {
  title: string;
  latitude: number;
  longitude: number;
};

export function getDirectionsUrl({ latitude, longitude }: MapDestination) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${latitude},${longitude}`)}`;
}

export function getPlatformDirectionsUrl(
  { title, latitude, longitude }: MapDestination,
  platform: typeof Platform.OS = Platform.OS,
) {
  if (platform === 'ios') {
    return `maps://?daddr=${encodeURIComponent(`${latitude},${longitude}`)}&dirflg=d`;
  }
  if (platform === 'android') {
    return `geo:${latitude},${longitude}?q=${encodeURIComponent(`${latitude},${longitude} (${title})`)}`;
  }
  return getDirectionsUrl({ title, latitude, longitude });
}

export async function openDirections(destination: MapDestination): Promise<boolean> {
  const url = getPlatformDirectionsUrl(destination);
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