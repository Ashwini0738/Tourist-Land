import { renderHook, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { useHomeLocation } from './useHomeLocation';

jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 'balanced' },
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
}));

const mockedPermission = Location.getForegroundPermissionsAsync as jest.MockedFunction<
  typeof Location.getForegroundPermissionsAsync
>;
const mockedCurrentPosition = Location.getCurrentPositionAsync as jest.MockedFunction<
  typeof Location.getCurrentPositionAsync
>;

describe('useHomeLocation', () => {
  beforeEach(() => {
    mockedPermission.mockResolvedValue({
      status: 'denied' as Location.PermissionStatus,
      granted: false,
      expires: 'never',
      canAskAgain: true,
    } as Awaited<ReturnType<typeof Location.getForegroundPermissionsAsync>>);
    mockedCurrentPosition.mockReset();
  });

  it('does not block the general Home experience when location is denied', async () => {
    const { result } = renderHook(() => useHomeLocation());

    await waitFor(() => expect(mockedPermission).toHaveBeenCalledTimes(1));

    expect(result.current.hasPermission).toBe(false);
    expect(result.current.locationName).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(mockedCurrentPosition).not.toHaveBeenCalled();
  });
});