import { useGetVendorDashboard } from '@workspace/api-client-react';
import React from 'react';
import { RoleDashboard } from '@/features/role/RoleDashboard';

export default function VendorDashboardScreen() {
  const { data } = useGetVendorDashboard();
  return (
    <RoleDashboard
      role="vendor"
      status="approved"
      message={data?.message ?? 'Your approved vendor workspace is ready.'}
    />
  );
}
