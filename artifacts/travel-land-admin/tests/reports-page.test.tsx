import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getAdminReports, useGetAdminReports } = vi.hoisted(() => ({
  getAdminReports: vi.fn(),
  useGetAdminReports: vi.fn(),
}));

vi.mock('@workspace/api-client-react', async () => {
  const actual = await vi.importActual<typeof import('@workspace/api-client-react')>('@workspace/api-client-react');
  return { ...actual, getAdminReports, useGetAdminReports };
});

import { ReportsPage } from '@/pages/reports-page';

const bookingsPageOne = {
  id: 'booking-1',
  reference: 'TL-001',
  hotelCatalogId: 'hotel-1',
  startsOn: '2026-08-10',
  endsOn: '2026-08-12',
  totalAmount: 300,
  currency: 'USD',
  status: 'confirmed',
  createdAt: '2026-08-10T09:00:00.000Z',
};

const bookingsPageTwo = { ...bookingsPageOne, id: 'booking-2', reference: 'TL-002' };

const reportFor = (page = 1, rows = [bookingsPageOne], hasMore = false) => ({
  source: 'database',
  provenance: 'live',
  timezone: 'UTC',
  generatedAt: '2026-08-31T09:00:00.000Z',
  range: { from: '2026-08-01', to: '2026-08-31' },
  filters: { country: null },
  unavailable: [],
  kpis: { bookings: 2 },
  breakdowns: { bookings: [], payments: [], enquiries: [], reviewRatings: [], roles: [], hotelsByCountry: [] },
  currencies: { bookings: [], payments: [] },
  trends: [],
  tables: {
    bookings: rows,
    payments: [],
    properties: [],
    enquiries: [],
    vendors: [],
  },
  meta: {
    bookings: { page, limit: 10, total: hasMore ? 2 : rows.length, hasMore },
    payments: { page: 1, limit: 10, total: 0, hasMore: false },
    properties: { page: 1, limit: 10, total: 0, hasMore: false },
    enquiries: { page: 1, limit: 10, total: 0, hasMore: false },
    vendors: { page: 1, limit: 10, total: 0, hasMore: false },
  },
  supportedFilters: { countries: ['India'], statuses: ['confirmed', 'paid'] },
});

describe('ReportsPage CSV export', () => {
  beforeEach(() => {
    getAdminReports.mockReset();
    useGetAdminReports.mockReset();
    useGetAdminReports.mockImplementation((params: { page?: number }) => ({
      data: params?.page === 2 ? reportFor(2, [bookingsPageTwo]) : reportFor(1, [bookingsPageOne], true),
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    }));
    getAdminReports.mockImplementation(async (params: { page?: number }) =>
      params.page === 2 ? reportFor(2, [bookingsPageTwo]) : reportFor(1, [bookingsPageOne], true),
    );
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:report');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it('loads every matching page while preserving active filters and currency columns', async () => {
    render(<ReportsPage />);

    fireEvent.change(screen.getByTestId('input-report-from'), { target: { value: '2026-08-01' } });
    fireEvent.change(screen.getByTestId('input-report-to'), { target: { value: '2026-08-31' } });
    fireEvent.change(screen.getByTestId('select-report-country'), { target: { value: 'India' } });
    fireEvent.change(screen.getByTestId('select-report-status'), { target: { value: 'confirmed' } });
    fireEvent.click(screen.getByTestId('button-apply-report-range'));
    fireEvent.click(screen.getByTestId('button-export-bookings'));

    await waitFor(() => expect(getAdminReports).toHaveBeenCalledTimes(2));
    expect(getAdminReports).toHaveBeenNthCalledWith(1, {
      from: '2026-08-01',
      to: '2026-08-31',
      country: 'India',
      status: 'confirmed',
      page: 1,
      limit: 100,
    });
    expect(getAdminReports).toHaveBeenNthCalledWith(2, {
      from: '2026-08-01',
      to: '2026-08-31',
      country: 'India',
      status: 'confirmed',
      page: 2,
      limit: 100,
    });
    expect(screen.getByTestId('text-report-export-status')).toHaveTextContent(
      'Exported 2 bookings across all matching pages.',
    );
    const [blob] = vi.mocked(URL.createObjectURL).mock.calls[0];
    const csv = await (blob as Blob).text();
    expect(csv).toContain('"USD"');
    expect(csv).toContain('"TL-002"');
  });

  it('downloads a valid header-only CSV and explains empty filtered results', async () => {
    useGetAdminReports.mockReturnValue({
      data: reportFor(1, [], false),
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    });
    getAdminReports.mockResolvedValue(reportFor(1, [], false));
    render(<ReportsPage />);

    fireEvent.click(screen.getByTestId('button-export-bookings'));

    await waitFor(() =>
      expect(screen.getByTestId('text-report-export-status')).toHaveTextContent(
        'No bookings match the selected filters. Downloaded an empty CSV with headers.',
      ),
    );
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    const [blob] = vi.mocked(URL.createObjectURL).mock.calls[0];
    expect(blob).toBeInstanceOf(Blob);
    expect(await (blob as Blob).text()).toContain('"id","reference","hotelCatalogId"');
    expect(await (blob as Blob).text()).not.toContain('booking-1');
  });
});