import React from 'react';
import { RoleModuleScreen } from '@/features/role/RoleDashboard';

export default function AdminVendorsScreen() {
  return <RoleModuleScreen role="admin" title="Manage vendors." description="Vendor review, approval, rejection, and suspension workflows will build on the protected admin API." />;
}
