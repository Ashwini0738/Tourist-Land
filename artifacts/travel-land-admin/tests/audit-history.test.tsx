import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { useListAdminAuditLogs, useGetAdminAuditLog } = vi.hoisted(() => ({
  useListAdminAuditLogs: vi.fn(),
  useGetAdminAuditLog: vi.fn(),
}));

vi.mock('@workspace/api-client-react', async () => {
  const actual = await vi.importActual<typeof import('@workspace/api-client-react')>('@workspace/api-client-react');
  return { ...actual, useListAdminAuditLogs, useGetAdminAuditLog };
});

import { AuditLogsPage } from '@/pages/admin-pages';

const pageOneItem = {
  id: 'audit-updated',
  adminUserId: 'admin-1',
  adminName: 'Jordan Admin',
  action: 'updated',
  entityType: 'destination',
  entityId: 'destination-1',
  destinationName: 'Kerala Backwaters',
  metadata: { fields: ['name', 'summary'] },
  createdAt: '2026-08-30T09:15:00.000Z',
};

const pageTwoItem = {
  id: 'audit-created',
  adminUserId: 'admin-1',
  adminName: 'Jordan Admin',
  action: 'created',
  entityType: 'destination',
  entityId: 'destination-2',
  destinationName: 'Goa Coast',
  metadata: {},
  createdAt: '2026-08-29T09:15:00.000Z',
};

const detailForUpdatedItem = {
  ...pageOneItem,
  revision: {
    fields: ['name', 'summary'],
    before: { name: 'Kerala Backwaters', summary: 'Original summary' },
    after: { name: 'Kerala Backwaters', summary: 'Updated summary' },
  },
};

const detailForCreatedItem = {
  ...pageTwoItem,
  revision: { fields: [], before: null, after: null },
};

let emptyHistory = false;
let auditHistoryShouldFail = false;
let auditDetailShouldFail = false;
let auditHistoryRefetch: ReturnType<typeof vi.fn>;
let auditDetailRefetch: ReturnType<typeof vi.fn>;

function responseFor(params?: { q?: string; page?: number }) {
  if (emptyHistory && !params?.q) {
    return { items: [], meta: { page: 1, limit: 20, total: 0, hasMore: false } };
  }
  if (params?.q === 'missing') {
    return { items: [], meta: { page: 1, limit: 20, total: 0, hasMore: false } };
  }
  if (params?.q) {
    return { items: [pageOneItem], meta: { page: 1, limit: 20, total: 1, hasMore: false } };
  }
  if (params?.page === 2) {
    return { items: [pageTwoItem], meta: { page: 2, limit: 20, total: 21, hasMore: false } };
  }
  return { items: [pageOneItem], meta: { page: 1, limit: 20, total: 21, hasMore: true } };
}

beforeEach(() => {
  emptyHistory = false;
  auditHistoryShouldFail = false;
  auditDetailShouldFail = false;
  auditHistoryRefetch = vi.fn();
  auditDetailRefetch = vi.fn();
  useListAdminAuditLogs.mockReset();
  useListAdminAuditLogs.mockImplementation((params) => {
    const [isError, setIsError] = useState(auditHistoryShouldFail);
    auditHistoryRefetch.mockImplementation(() => setIsError(false));

    return {
      data: isError ? undefined : responseFor(params),
      isLoading: false,
      isError,
      isFetching: false,
      refetch: auditHistoryRefetch,
    };
  });
  useGetAdminAuditLog.mockImplementation((id) => {
    const [isError, setIsError] = useState(auditDetailShouldFail);
    auditDetailRefetch.mockImplementation(() => setIsError(false));

    return {
      data: isError ? undefined : id === 'audit-updated' ? detailForUpdatedItem : detailForCreatedItem,
      isLoading: false,
      isError,
      isFetching: false,
      refetch: auditDetailRefetch,
    };
  });
});

afterEach(() => {
  cleanup();
});

describe('AuditLogsPage', () => {
  it('renders destination records with actor, action, timestamp, destination, and safe metadata', () => {
    render(<AuditLogsPage />);

    expect(screen.getByTestId('text-audit-filter')).toHaveTextContent('Destination changes');
    expect(screen.getByText('Jordan Admin')).toBeInTheDocument();
    expect(screen.getByTestId('audit-action-audit-updated')).toHaveTextContent('updated');
    expect(screen.getByTestId('audit-destination-audit-updated')).toHaveTextContent('Kerala Backwaters');
    expect(screen.getByText('fields: name, summary')).toBeInTheDocument();
    expect(screen.getByText('Aug 30, 2026')).toBeInTheDocument();
    expect(screen.getByText('9:15 AM')).toBeInTheDocument();
  });

  it('uses server pagination metadata to enable and disable navigation', async () => {
    render(<AuditLogsPage />);

    expect(screen.getByTestId('text-audit-pagination')).toHaveTextContent('Page 1 · Showing 1 of 21 records');
    expect(screen.getByTestId('button-audit-previous')).toBeDisabled();
    expect(screen.getByTestId('button-audit-next')).toBeEnabled();

    fireEvent.click(screen.getByTestId('button-audit-next'));

    await waitFor(() => expect(screen.getByTestId('text-audit-pagination')).toHaveTextContent('Page 2 · Showing 1 of 21 records'));
    expect(screen.getByTestId('button-audit-previous')).toBeEnabled();
    expect(screen.getByTestId('button-audit-next')).toBeDisabled();
    expect(screen.getByTestId('audit-destination-audit-created')).toHaveTextContent('Goa Coast');

    fireEvent.click(screen.getByTestId('button-audit-previous'));
    await waitFor(() => expect(screen.getByTestId('text-audit-pagination')).toHaveTextContent('Page 1 · Showing 1 of 21 records'));
  });

  it('resets pagination to page one when search changes', async () => {
    render(<AuditLogsPage />);
    fireEvent.click(screen.getByTestId('button-audit-next'));
    await waitFor(() => expect(screen.getByTestId('text-audit-pagination')).toHaveTextContent('Page 2'));

    fireEvent.change(screen.getByTestId('input-search'), { target: { value: 'edited' } });

    await waitFor(() => expect(useListAdminAuditLogs).toHaveBeenLastCalledWith({
      entityType: 'destination',
      q: 'edited',
      page: 1,
      limit: 20,
    }));
    expect(screen.queryByTestId('text-audit-pagination')).not.toBeInTheDocument();
  });

  it('recovers from an audit history load error when retry is selected', async () => {
    auditHistoryShouldFail = true;
    render(<AuditLogsPage />);

    expect(screen.getByText('This view could not load')).toBeInTheDocument();
    expect(screen.getByText('Check administrator access or try again.')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('button-retry'));

    await waitFor(() => expect(screen.getByTestId('audit-destination-audit-updated')).toHaveTextContent('Kerala Backwaters'));
    expect(auditHistoryRefetch).toHaveBeenCalledTimes(1);
    expect(useListAdminAuditLogs).toHaveBeenCalledWith({
      entityType: 'destination',
      q: undefined,
      page: 1,
      limit: 20,
    });
    expect(screen.queryByText('This view could not load')).not.toBeInTheDocument();
  });

  it('distinguishes no matches from an empty audit history', () => {
    const { unmount } = render(<AuditLogsPage />);
    fireEvent.change(screen.getByTestId('input-search'), { target: { value: 'missing' } });

    expect(screen.getByText('No matching destination changes')).toBeInTheDocument();
    expect(screen.getByText('Try a different destination name, action, or record ID.')).toBeInTheDocument();
    expect(screen.getByTestId('button-clear-audit-search')).toBeInTheDocument();

    unmount();
    emptyHistory = true;
    render(<AuditLogsPage />);

    expect(screen.getByText('No destination changes yet')).toBeInTheDocument();
    expect(screen.getByText('Destination creation and edits will appear here once recorded.')).toBeInTheDocument();
    expect(screen.queryByTestId('button-clear-audit-search')).not.toBeInTheDocument();
  });

  it('opens a revision detail view with recorded before and after values', () => {
    render(<AuditLogsPage />);

    fireEvent.click(screen.getByTestId('button-audit-details-audit-updated'));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Original summary')).toBeInTheDocument();
    expect(screen.getByText('Updated summary')).toBeInTheDocument();
    expect(screen.getByTestId('audit-before-name')).toHaveTextContent('Kerala Backwaters');
    expect(screen.getByTestId('audit-after-name')).toHaveTextContent('Kerala Backwaters');

    fireEvent.click(screen.getByTestId('button-close-audit-details'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('labels missing historical revision detail as unavailable', () => {
    render(<AuditLogsPage />);

    fireEvent.click(screen.getByTestId('button-audit-next'));
    fireEvent.click(screen.getByTestId('button-audit-details-audit-created'));

    expect(screen.getByTestId('audit-detail-unavailable')).toHaveTextContent('Unavailable');
  });

  it('recovers from a revision detail load error when retry is selected', async () => {
    auditDetailShouldFail = true;
    render(<AuditLogsPage />);

    fireEvent.click(screen.getByTestId('button-audit-details-audit-updated'));

    expect(screen.getByTestId('audit-detail-unavailable')).toHaveTextContent('Revision details unavailable');
    expect(screen.getByTestId('button-retry-audit-detail')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('button-retry-audit-detail'));

    await waitFor(() => expect(screen.getByTestId('audit-before-name')).toHaveTextContent('Kerala Backwaters'));
    expect(screen.getByTestId('audit-after-summary')).toHaveTextContent('Updated summary');
    expect(auditDetailRefetch).toHaveBeenCalledTimes(1);
    expect(useListAdminAuditLogs).toHaveBeenCalledWith({
      entityType: 'destination',
      q: undefined,
      page: 1,
      limit: 20,
    });
  });
});