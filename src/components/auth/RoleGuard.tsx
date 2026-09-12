import React from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { UserRole } from '@/lib/types';
import { hasRole } from '@/lib/utils';

interface RoleGuardProps {
  children: React.ReactNode;
  requiredRole: UserRole;
  fallback?: React.ReactNode;
}

export function RoleGuard({ children, requiredRole, fallback = null }: RoleGuardProps) {
  const { profile } = useAuthContext();

  if (!profile || !hasRole(profile.roles, requiredRole)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
