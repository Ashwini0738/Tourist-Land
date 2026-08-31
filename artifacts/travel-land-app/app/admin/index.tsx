import { useGetAdminOperationsDashboard } from '@workspace/api-client-react';
import React from 'react';
import { RoleDashboard } from '@/features/role/RoleDashboard';

export default function AdminDashboardScreen() {
  const { data } = useGetAdminOperationsDashboard();
  return (
    <RoleDashboard
      role="admin"
      status="active"
      message={data ? 'Platform administration is ready.' : 'Loading platform administration.'}
    />
  );
}
