import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { UserRole } from '@/lib/types';
import { hasRole, hasAnyRole } from '@/lib/utils';
import { Loader2, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EntitySelector } from './EntitySelector';

interface ProtectedRouteProps {
  children?: React.ReactNode;
  requiredRole?: UserRole;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, requiredRole, allowedRoles }: ProtectedRouteProps) {
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

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-lg">
          <AlertTriangle className="mx-auto mb-4 h-16 w-16 text-red-500" />
          <h2 className="mb-2 text-2xl font-bold text-gray-900">Session Expired</h2>
          <p className="mb-8 text-gray-600">
            Your account profile could not be found. It may have been deleted by an administrator. Please sign out and try logging in again.
          </p>
          <Button onClick={signOut} className="w-full bg-red-600 hover:bg-red-700">
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  if (profile?.status === 'inactive') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-lg">
          <AlertTriangle className="mx-auto mb-4 h-16 w-16 text-red-500" />
          <h2 className="mb-2 text-2xl font-bold text-gray-900">Account Deactivated</h2>
          <p className="mb-8 text-gray-600">
            Your account has been deactivated by an administrator. Please contact IT or HR for assistance.
          </p>
          <Button onClick={signOut} variant="outline" className="w-full">
            Sign Out
          </Button>
        </div>
      </div>
    );
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

  if (profile && !profile.entity_selected) {
    return <EntitySelector />;
  }

  const hasAccess = () => {
    if (!profile) return false;
    
    // Admin access check (backward compatibility)
    if (requiredRole && hasRole(profile.roles, requiredRole)) return true;
    
    // Multiple role access check
    if (allowedRoles && hasAnyRole(profile.roles, allowedRoles)) return true;
    
    // If neither requirement was passed, access is granted to all authenticated users
    if (!requiredRole && !allowedRoles) return true;
    
    return false;
  };

  if (!hasAccess()) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-lg">
          <AlertTriangle className="mx-auto mb-4 h-16 w-16 text-red-500" />
          <h2 className="mb-2 text-2xl font-bold text-gray-900">Access Denied</h2>
          <p className="mb-8 text-gray-600">
            You do not have permission to view this page.
          </p>
          <div className="flex flex-col gap-3">
            <Button onClick={() => window.location.href = '/'} variant="outline" className="w-full">
              Go Back
            </Button>
            <Button onClick={signOut} variant="ghost" className="w-full text-gray-500">
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children || <Outlet />}</>;
}

