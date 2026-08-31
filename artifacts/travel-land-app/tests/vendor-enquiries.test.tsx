import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

const mockUseListVendorEnquiries = jest.fn();
const mockUseUpdateVendorEnquiry = jest.fn();

jest.mock('@workspace/api-client-react', () => ({
  useListVendorEnquiries: mockUseListVendorEnquiries,
  useUpdateVendorEnquiry: mockUseUpdateVendorEnquiry,
}));

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
}));

jest.mock('@/components/PlatformIcon', () => ({
  PlatformIcon: () => null,
}));

jest.mock('@/hooks/useColors', () => ({
  useColors: () => ({
    background: '#ffffff',
    foreground: '#111111',
    primary: '#14532d',
    primaryForeground: '#ffffff',
    accent: '#f5c26b',
    accentForeground: '#3f2a10',
    secondary: '#eef2ee',
    mutedForeground: '#66736a',
    border: '#d9dfda',
    card: '#ffffff',
    destructive: '#b42318',
    input: '#d9dfda',
    muted: '#eef2ee',
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

const VendorEnquiriesScreen = require('../app/vendor/enquiries').default as typeof import('../app/vendor/enquiries').default;

const enquiry = {
  id: 'enquiry-1',
  property: { id: 'property-1', title: 'Misty Valley Stay', address: 'Munnar, Kerala' },
  customer: {
    id: 'customer-1',
    name: 'Asha Thomas',
    email: 'asha@example.com',
    phone: '+91 98765 43210',
  },
  message: 'Is the garden cottage available in October?',
  preferredContactMethod: 'email' as const,
  status: 'new' as const,
  createdAt: '2026-08-30T08:00:00.000Z',
  updatedAt: '2026-08-30T08:00:00.000Z',
  history: [
    { id: 'history-1', status: 'new' as const, note: 'Customer submitted an enquiry', createdAt: '2026-08-30T08:00:00.000Z' },
  ],
};

describe('VendorEnquiriesScreen', () => {
  const refetch = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseListVendorEnquiries.mockReturnValue({
      data: { items: [enquiry] },
      isLoading: false,
      isError: false,
      refetch,
    });
    mockUseUpdateVendorEnquiry.mockReturnValue({
      isPending: false,
      mutateAsync: jest.fn().mockResolvedValue(undefined),
    });
  });

  it('shows loading and empty states from the vendor enquiry query', () => {
    mockUseListVendorEnquiries.mockReturnValueOnce({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch,
    });
    const loadingScreen = render(<VendorEnquiriesScreen />);
    expect(loadingScreen.getByText('Loading enquiries…')).toBeTruthy();
    loadingScreen.unmount();

    mockUseListVendorEnquiries.mockReturnValueOnce({
      data: { items: [] },
      isLoading: false,
      isError: false,
      refetch,
    });
    const emptyScreen = render(<VendorEnquiriesScreen />);
    expect(emptyScreen.getByText('No enquiries yet')).toBeTruthy();
  });

  it('renders only returned vendor enquiries with customer details and status history', () => {
    const screen = render(<VendorEnquiriesScreen />);

    expect(screen.getByText('Misty Valley Stay')).toBeTruthy();
    expect(screen.getByText('Asha Thomas')).toBeTruthy();
    expect(screen.getByText('asha@example.com · +91 98765 43210')).toBeTruthy();
    expect(screen.getByText('Is the garden cottage available in October?')).toBeTruthy();
    expect(screen.getAllByText('New')).toHaveLength(2);
    expect(screen.getByText('STATUS HISTORY')).toBeTruthy();
    expect(screen.getByText(/Customer submitted an enquiry/)).toBeTruthy();
    expect(screen.queryByText('A different vendor property')).toBeNull();
  });

  it('renders refreshed enquiry status and history after advancing while keeping the success notice', async () => {
    const mutateAsync = jest.fn().mockResolvedValue(undefined);
    mockUseUpdateVendorEnquiry.mockReturnValue({ isPending: false, mutateAsync });
    const refreshedEnquiry = {
      ...enquiry,
      status: 'contacted' as const,
      updatedAt: '2026-08-31T08:00:00.000Z',
      history: [
        ...enquiry.history,
        {
          id: 'history-2',
          status: 'contacted' as const,
          note: 'Vendor contacted the customer',
          createdAt: '2026-08-31T08:00:00.000Z',
        },
      ],
    };
    mockUseListVendorEnquiries.mockImplementation(() => {
      const [data, setData] = React.useState<{ items: Array<typeof enquiry | typeof refreshedEnquiry> }>({
        items: [enquiry],
      });
      return {
        data,
        isLoading: false,
        isError: false,
        refetch: jest.fn().mockImplementation(async () => {
          setData({ items: [refreshedEnquiry] });
        }),
      };
    });
    const screen = render(<VendorEnquiriesScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Mark contacted' }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({
      id: 'enquiry-1',
      data: { status: 'contacted' },
    }));
    await waitFor(() => {
      expect(screen.getAllByText('Contacted')).toHaveLength(2);
      expect(screen.getByText(/Vendor contacted the customer/)).toBeTruthy();
    });
    expect(screen.queryByRole('button', { name: 'Mark contacted' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Mark closed' })).toBeTruthy();
    expect(screen.getByText('Enquiry for Misty Valley Stay is now contacted.')).toBeTruthy();
  });

  it('shows mutation errors in an accessible alert', async () => {
    const mutateAsync = jest.fn().mockRejectedValue(new Error('Vendor service is unavailable.'));
    mockUseUpdateVendorEnquiry.mockReturnValue({ isPending: false, mutateAsync });
    const screen = render(<VendorEnquiriesScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Mark contacted' }));

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toBeTruthy();
      expect(screen.getByText('Vendor service is unavailable.')).toBeTruthy();
    });
  });
});