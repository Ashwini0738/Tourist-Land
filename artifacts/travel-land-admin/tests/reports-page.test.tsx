import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchMock, useGetAdminReports } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  useGetAdminReports: vi.fn(),
}));

vi.mock('@workspace/api-client-react', async () => {
  const actual = await vi.importActual<typeof import('@workspace/api-client-react')>('@workspace/api-client-react');
  return { ...actual, useGetAdminReports };
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
    fetchMock.mockReset();
    useGetAdminReports.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    useGetAdminReports.mockImplementation((params: { page?: number }) => ({
      data: params?.page === 2 ? reportFor(2, [bookingsPageTwo]) : reportFor(1, [bookingsPageOne], true),
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    }));
    fetchMock.mockResolvedValue(
      new Response(null, { status: 200, headers: { 'X-Report-Row-Count': '250000' } }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (window as any).showSaveFilePicker;
    cleanup();
  });

  it('starts a server stream for a large result while preserving active filters and the selected table', async () => {
    render(<ReportsPage />);

    fireEvent.change(screen.getByTestId('input-report-from'), { target: { value: '2026-08-01' } });
    fireEvent.change(screen.getByTestId('input-report-to'), { target: { value: '2026-08-31' } });
    fireEvent.change(screen.getByTestId('select-report-country'), { target: { value: 'India' } });
    fireEvent.change(screen.getByTestId('select-report-status'), { target: { value: 'confirmed' } });
    fireEvent.click(screen.getByTestId('button-apply-report-range'));
    fireEvent.click(screen.getByTestId('button-export-bookings'));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/admin/reports/export?from=2026-08-01&to=2026-08-31&country=India&status=confirmed&table=bookings',
      { method: 'HEAD', credentials: 'include' },
    );
    expect(screen.getByTestId('text-report-export-status')).toHaveTextContent(
      'Download started: the server is streaming 250,000 bookings without loading all rows in the browser.',
    );
  });

  it('downloads a valid header-only CSV and explains empty filtered results', async () => {
    useGetAdminReports.mockReturnValue({
      data: reportFor(1, [], false),
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    });
    fetchMock.mockResolvedValue(
      new Response(null, { status: 200, headers: { 'X-Report-Row-Count': '0' } }),
    );
    render(<ReportsPage />);

    fireEvent.click(screen.getByTestId('button-export-bookings'));

    await waitFor(() =>
      expect(screen.getByTestId('text-report-export-status')).toHaveTextContent(
        'Download started: an empty bookings CSV with headers.',
      ),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('explains an interrupted streamed save and aborts the partial file', async () => {
    const abort = vi.fn();
    const write = vi.fn();
    const close = vi.fn();
    const read = vi.fn()
      .mockResolvedValueOnce({ done: false, value: new Uint8Array([1, 2]) })
      .mockRejectedValueOnce(new Error('connection reset'));
    const createWritable = vi.fn().mockResolvedValue({ write, close, abort });
    Object.assign(window, {
      showSaveFilePicker: vi.fn().mockResolvedValue({ createWritable }),
    });
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 200, headers: { 'X-Report-Row-Count': '2' } }))
      .mockResolvedValueOnce({
        ok: true,
        body: { getReader: () => ({ read }) },
        headers: new Headers(),
      });

    render(<ReportsPage />);
    fireEvent.click(screen.getByTestId('button-export-bookings'));

    await waitFor(() =>
      expect(screen.getByTestId('text-report-export-status')).toHaveTextContent(
        'The export download was interrupted before it finished. Try again.',
      ),
    );
    expect(abort).toHaveBeenCalledTimes(1);
  });
});