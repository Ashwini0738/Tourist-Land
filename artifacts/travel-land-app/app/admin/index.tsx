import { useGetAdminDashboard } from '@workspace/api-client-react';
import React from 'react';
import { RoleDashboard } from '@/features/role/RoleDashboard';

export default function AdminDashboardScreen() {
  const { data } = useGetAdminDashboard();
  return (
    <RoleDashboard
      role="admin"
      status="active"
      message={data?.message ?? 'Platform administration is ready.'}
    />
  );
}
