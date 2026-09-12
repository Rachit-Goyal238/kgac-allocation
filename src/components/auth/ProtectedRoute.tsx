import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { UserRole } from '@/lib/types';
import { hasRole } from '@/lib/utils';
import { Loader2, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EntitySelector } from './EntitySelector';

interface ProtectedRouteProps {
  children?: React.ReactNode;
  requiredRole?: UserRole;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, profile, isLoading, signOut } = useAuthContext();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-10 w-10 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (profile && !profile.entity) {
    return <EntitySelector />;
  }

  if (profile?.status === 'pending') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-lg">
          <Clock className="mx-auto mb-4 h-16 w-16 text-yellow-500" />
          <h2 className="mb-2 text-2xl font-bold text-gray-900">Account Pending Approval</h2>
          <p className="mb-8 text-gray-600">
            Your account is awaiting admin approval. You'll receive access once approved.
          </p>
          <Button onClick={signOut} variant="outline" className="w-full">
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  if (requiredRole && profile && !hasRole(profile.roles, requiredRole)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-lg">
          <AlertTriangle className="mx-auto mb-4 h-16 w-16 text-red-500" />
          <h2 className="mb-2 text-2xl font-bold text-gray-900">Access Denied</h2>
          <p className="mb-8 text-gray-600">
            You do not have permission to view this page.
          </p>
          <Button onClick={() => window.history.back()} variant="outline" className="w-full">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return <>{children || <Outlet />}</>;
}
