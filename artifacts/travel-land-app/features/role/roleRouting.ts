import type { PrimaryRole } from '@workspace/api-client-react';

export type RoleHome = '/(tabs)' | '/vendor' | '/admin';

export function roleHome(role: PrimaryRole): RoleHome {
  if (role === 'vendor') return '/vendor';
  if (role === 'admin') return '/admin';
  return '/(tabs)';
}

export function unauthorizedHome(role: PrimaryRole, rootSegment: string | undefined): RoleHome | null {
  if (rootSegment === 'admin') return role === 'admin' ? null : roleHome(role);
  if (rootSegment === 'vendor') return role === 'admin' || role === 'vendor' ? null : roleHome(role);
  return null;
}
