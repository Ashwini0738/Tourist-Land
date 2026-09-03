import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SecureStorageRecovery } from './SecureStorageRecovery';

jest.mock('@/context/AuthContext', () => ({
  useMobileAuth: jest.fn(),
}));

jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));

const { useMobileAuth } = jest.requireMock('@/context/AuthContext') as { useMobileAuth: jest.Mock };
const { useRouter } = jest.requireMock('expo-router') as { useRouter: jest.Mock };

describe('SecureStorageRecovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useMobileAuth.mockReturnValue({ signOut: jest.fn().mockResolvedValue(undefined) });
    useRouter.mockReturnValue({ replace: jest.fn() });
  });

  it('signs out and returns to login safely', async () => {
    const signOut = useMobileAuth().signOut;
    const replace = useRouter().replace;
    const screen = render(<SecureStorageRecovery onRetry={jest.fn().mockResolvedValue(undefined)} />);

    fireEvent.press(screen.getByTestId('secure-storage-sign-out'));

    await waitFor(() => {
      expect(signOut).toHaveBeenCalledTimes(1);
      expect(replace).toHaveBeenCalledWith('/login');
    });
  });

  it('keeps the recovery state and hides raw retry errors', async () => {
    const screen = render(
      <SecureStorageRecovery onRetry={jest.fn().mockRejectedValue(new Error('native storage details'))} />,
    );

    fireEvent.press(screen.getByTestId('secure-storage-retry'));

    await waitFor(() => {
      expect(screen.getByText('We could not securely access your device settings yet. Please try again.')).toBeTruthy();
    });
    expect(screen.queryByText('native storage details')).toBeNull();
    expect(screen.getByTestId('secure-storage-recovery')).toBeTruthy();
  });
});