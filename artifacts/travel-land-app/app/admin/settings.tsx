import React from 'react';
import { RoleModuleScreen } from '@/features/role/RoleDashboard';

export default function AdminSettingsScreen() {
  return <RoleModuleScreen role="admin" title="Platform settings." description="System-level settings will be added here with explicit admin-only API authorization." />;
}
