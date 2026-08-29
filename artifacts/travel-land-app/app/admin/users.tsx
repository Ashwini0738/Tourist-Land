import React from 'react';
import { RoleModuleScreen } from '@/features/role/RoleDashboard';

export default function AdminUsersScreen() {
  return <RoleModuleScreen role="admin" title="Manage users." description="Safe user records and role controls will be expanded here without exposing credentials or tokens." />;
}
