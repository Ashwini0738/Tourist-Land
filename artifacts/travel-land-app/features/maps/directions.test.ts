import { Linking } from 'react-native';
import { getDirectionsUrl, openDirections } from './directions';

describe('map directions', () => {
  it('creates a platform-neutral navigation URL from catalog coordinates', () => {
    expect(getDirectionsUrl({ title: 'Coorg Highlands', latitude: 12.42, longitude: 75.74 }))
      .toBe('https://www.google.com/maps/dir/?api=1&destination=12.42%2C75.74');
  });

  it('returns false when the platform cannot open navigation', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockRejectedValueOnce(new Error('unavailable'));
    await expect(openDirections({ title: 'Coorg Highlands', latitude: 12.42, longitude: 75.74 })).resolves.toBe(false);
    openURL.mockRestore();
  });
});