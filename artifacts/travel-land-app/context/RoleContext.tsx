import {
  getGetCurrentUserQueryKey,
  useGetCurrentUser,
  type CurrentUser,
  type PrimaryRole,
} from '@workspace/api-client-react';
import { useAuth } from '@clerk/expo';
import { useQueryClient } from '@tanstack/react-query';
import React, { createContext, useContext, useEffect } from 'react';
import { useAuthSecurity } from './AuthSecurityContext';

type RoleContextValue = {
  currentUser: CurrentUser | undefined;
  role: PrimaryRole | null;
  isReady: boolean;
  isLoading: boolean;
  isError: boolean;
  refetch: () => Promise<unknown>;
};

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, userId } = useAuth();
  const { isReady: securityReady, isUnlocked } = useAuthSecurity();
  const queryClient = useQueryClient();
  const enabled = Boolean(isSignedIn && securityReady && isUnlocked);
  const query = useGetCurrentUser({
    query: {
      enabled,
      retry: false,
      queryKey: [...getGetCurrentUserQueryKey(), userId ?? 'signed-out'],
    },
  });

  useEffect(() => {
    if (!isSignedIn) {
      queryClient.removeQueries({ queryKey: getGetCurrentUserQueryKey() });
    }
  }, [isSignedIn, queryClient]);

  return (
    <RoleContext.Provider
      value={{
        currentUser: query.data,
        role: query.data?.role ?? null,
        isReady: !enabled || query.isSuccess,
        isLoading: enabled && query.isLoading,
        isError: enabled && query.isError,
        refetch: query.refetch,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const value = useContext(RoleContext);
  if (!value) throw new Error('useRole must be used inside RoleProvider');
  return value;
}
