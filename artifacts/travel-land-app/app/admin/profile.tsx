import React from 'react';
import { useRole } from '@/context/RoleContext';
import { RoleProfileScreen } from '@/features/role/RoleDashboard';

export default function AdminProfileScreen() {
  const { currentUser } = useRole();
  return <RoleProfileScreen role="admin" currentUser={currentUser} />;
}