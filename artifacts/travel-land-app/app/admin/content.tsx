import React from 'react';
import { RoleModuleScreen } from '@/features/role/RoleDashboard';

export default function AdminContentScreen() {
  return <RoleModuleScreen role="admin" title="Manage content." description="Destinations, places, and events will build on this protected admin navigation surface." />;
}
