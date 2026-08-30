import React from 'react';
import { getGetVendorProfileQueryKey, useGetVendorProfile } from '@workspace/api-client-react';
import { RoleProfileScreen } from '@/features/role/RoleDashboard';
import { useRole } from '@/context/RoleContext';

export default function VendorProfileScreen() {
  const { currentUser } = useRole();
  const profileQuery = useGetVendorProfile({
    query: {
      enabled: Boolean(currentUser),
      retry: false,
      queryKey: [...getGetVendorProfileQueryKey(), currentUser?.id ?? 'signed-out'],
    },
  });
  return (
    <RoleProfileScreen
      role="vendor"
      currentUser={currentUser}
      vendorProfile={profileQuery.data ?? currentUser?.vendorProfile}
      profileNotice={profileQuery.isError ? 'Business profile details could not be refreshed. Showing the last available account details.' : undefined}
    />
  );
}
