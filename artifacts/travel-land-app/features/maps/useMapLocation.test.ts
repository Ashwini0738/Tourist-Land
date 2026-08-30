import { renderHook, waitFor, act } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { getMapLocationMessage, useMapLocation } from './useMapLocation';

jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 'balanced' },
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
  hasServicesEnabledAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
}));

const permission = Location.getForegroundPermissionsAsync as jest.MockedFunction<typeof Location.getForegroundPermissionsAsync>;
const requestPermission = Location.requestForegroundPermissionsAsync as jest.MockedFunction<typeof Location.requestForegroundPermissionsAsync>;
const currentPosition = Location.getCurrentPositionAsync as jest.MockedFunction<typeof Location.getCurrentPositionAsync>;
const reverseGeocode = Location.reverseGeocodeAsync as jest.MockedFunction<typeof Location.reverseGeocodeAsync>;
const servicesEnabled = Location.hasServicesEnabledAsync as jest.MockedFunction<typeof Location.hasServicesEnabledAsync>;
const watchPosition = Location.watchPositionAsync as jest.MockedFunction<typeof Location.watchPositionAsync>;

describe('useMapLocation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    permission.mockResolvedValue({ status: 'denied', granted: false, expires: 'never', canAskAgain: true } as never);
    requestPermission.mockResolvedValue({ status: 'denied', granted: false, expires: 'never', canAskAgain: true } as never);
    servicesEnabled.mockResolvedValue(true);
    watchPosition.mockReset();
  });

  it('does not ask for or read a position until the user requests it', async () => {
    const { result } = renderHook(() => useMapLocation());
    await waitFor(() => expect(permission).toHaveBeenCalledTimes(1));
    expect(requestPermission).not.toHaveBeenCalled();
    expect(currentPosition).not.toHaveBeenCalled();

    requestPermission.mockResolvedValue({ status: 'granted', granted: true, expires: 'never', canAskAgain: true } as never);
    currentPosition.mockResolvedValue({ coords: { latitude: 12.42, longitude: 75.74, accuracy: 8 } } as never);
    reverseGeocode.mockResolvedValue([{ city: 'Madikeri', country: 'India' }] as never);
    await act(async () => { await result.current.requestLocation(); });

    expect(currentPosition).toHaveBeenCalledWith({ accuracy: Location.Accuracy.Balanced });
    expect(result.current.location).toMatchObject({ latitude: 12.42, longitude: 75.74, name: 'Madikeri, India' });
    expect(result.current.error).toBeNull();
    expect(watchPosition).not.toHaveBeenCalled();
  });

  it('reports denied, blocked, and GPS-disabled outcomes without preventing discovery', async () => {
    const { result } = renderHook(() => useMapLocation());
    await waitFor(() => expect(permission).toHaveBeenCalledTimes(1));

    await act(async () => { await result.current.requestLocation(); });
    expect(result.current.error).toBe('permission-denied');
    expect(getMapLocationMessage(result.current.permission, result.current.error)).toMatch(/declined/);

    requestPermission.mockResolvedValue({ status: 'denied', granted: false, expires: 'never', canAskAgain: false } as never);
    await act(async () => { await result.current.requestLocation(); });
    expect(result.current.error).toBe('permission-blocked');

    requestPermission.mockResolvedValue({ status: 'granted', granted: true, expires: 'never', canAskAgain: true } as never);
    servicesEnabled.mockResolvedValue(false);
    await act(async () => { await result.current.requestLocation(); });
    expect(result.current.error).toBe('gps-disabled');
    expect(currentPosition).not.toHaveBeenCalled();
  });

  it('reports an unavailable lookup without starting continuous tracking', async () => {
    const { result } = renderHook(() => useMapLocation());
    await waitFor(() => expect(permission).toHaveBeenCalledTimes(1));

    requestPermission.mockResolvedValue({ status: 'granted', granted: true, expires: 'never', canAskAgain: true } as never);
    currentPosition.mockRejectedValue(new Error('No position available'));
    await act(async () => { await result.current.requestLocation(); });

    expect(result.current.error).toBe('unavailable');
    expect(getMapLocationMessage(result.current.permission, result.current.error)).toMatch(/unavailable/);
    expect(watchPosition).not.toHaveBeenCalled();
  });
});