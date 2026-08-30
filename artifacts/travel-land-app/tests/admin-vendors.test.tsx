import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

const mockUseListAdminVendorApplications = jest.fn();
const mockUseListAdminVendorApprovalHistory = jest.fn();
const mockUseApproveVendorApplication = jest.fn();
const mockUseRejectVendorApplication = jest.fn();

jest.mock('@workspace/api-client-react', () => ({
  useListAdminVendorApplications: mockUseListAdminVendorApplications,
  useListAdminVendorApprovalHistory: mockUseListAdminVendorApprovalHistory,
  useApproveVendorApplication: mockUseApproveVendorApplication,
  useRejectVendorApplication: mockUseRejectVendorApplication,
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
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

const AdminVendorsScreen = require('../app/admin/vendors').default as typeof import('../app/admin/vendors').default;

const application = {
  id: 'application-1',
  userId: null,
  businessName: 'Green Valley Stays',
  businessType: 'Homestay',
  contactName: 'Vendor Owner',
  phone: '+91 99999 99999',
  email: 'vendor@example.com',
  description: 'A verified place to stay.',
  address: '1 Valley Road',
  city: 'Munnar',
  state: 'Kerala',
  country: 'India',
  status: 'pending',
  createdAt: '2026-08-30T00:00:00.000Z',
  updatedAt: '2026-08-30T00:00:00.000Z',
  reviewedAt: null,
  invitedAt: null,
};

const approval = {
  id: 'approval-1',
  applicationId: application.id,
  businessName: application.businessName,
  vendorEmail: application.email,
  approvedBy: {
    id: 'admin-1',
    displayName: 'Admin Reviewer',
    email: 'admin@example.com',
  },
  approvedAt: '2026-08-30T10:15:00.000Z',
  invitationCreated: true,
  approvalEmailStatus: 'failed',
};

describe('AdminVendorsScreen', () => {
  const applicationsRefetch = jest.fn().mockResolvedValue(undefined);
  const historyRefetch = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseListAdminVendorApplications.mockReturnValue({
      data: { items: [application] },
      isLoading: false,
      isFetching: false,
      refetch: applicationsRefetch,
    });
    mockUseListAdminVendorApprovalHistory.mockReturnValue({
      data: { items: [approval] },
      isLoading: false,
      isFetching: false,
      refetch: historyRefetch,
    });
    mockUseRejectVendorApplication.mockReturnValue({
      isPending: false,
      mutateAsync: jest.fn(),
    });
  });

  it('shows a visible success result when Resend delivers the approval email', async () => {
    mockUseApproveVendorApplication.mockReturnValue({
      isPending: false,
      mutateAsync: jest.fn().mockResolvedValue({ ...application, status: 'invited', approvalEmailStatus: 'sent' }),
    });
    const screen = render(<AdminVendorsScreen />);

    fireEvent.press(screen.getByText('Approve application'));

    await waitFor(() => expect(screen.getByText('Vendor approved and email sent.')).toBeTruthy());
    expect(applicationsRefetch).toHaveBeenCalledTimes(1);
    expect(historyRefetch).toHaveBeenCalledTimes(1);
  });

  it('shows a visible warning when Resend rejects the approval email', async () => {
    mockUseApproveVendorApplication.mockReturnValue({
      isPending: false,
      mutateAsync: jest.fn().mockResolvedValue({ ...application, status: 'accepted', approvalEmailStatus: 'failed' }),
    });
    const screen = render(<AdminVendorsScreen />);

    fireEvent.press(screen.getByText('Approve application'));

    await waitFor(() => expect(
      screen.getByText('Vendor approved, but the approval email could not be delivered.'),
    ).toBeTruthy());
    expect(applicationsRefetch).toHaveBeenCalledTimes(1);
    expect(historyRefetch).toHaveBeenCalledTimes(1);
  });

  it('keeps failed approval emails visible in the durable history', () => {
    const screen = render(<AdminVendorsScreen />);

    expect(screen.getByText('APPROVAL HISTORY')).toBeTruthy();
    expect(screen.getByText('EMAIL FAILED')).toBeTruthy();
    expect(screen.getByText('Approved by Admin Reviewer')).toBeTruthy();
    expect(screen.getByText('Clerk invitation created')).toBeTruthy();
  });
});