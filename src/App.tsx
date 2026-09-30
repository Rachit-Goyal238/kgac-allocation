import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Layout & Auth components
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

// Lazy loading pages for better performance
const LoginPage = lazy(() => import('@/components/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const CalendarPage = lazy(() => import('@/pages/CalendarPage').then(m => ({ default: m.CalendarPage })));
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const AdminPage = lazy(() => import('@/pages/AdminPage').then(m => ({ default: m.AdminPage })));
const BillingPage = lazy(() => import('@/pages/BillingPage').then(m => ({ default: m.BillingPage })));
const ManDaysPage = lazy(() => import('@/pages/ManDaysPage').then(m => ({ default: m.ManDaysPage })));
const CommandPage = lazy(() => import('@/pages/SuperAdminCommandCenter').then(m => ({ default: m.SuperAdminCommandCenter })));
const CompletionPage = lazy(() => import('@/pages/CompletionPage').then(m => ({ default: m.CompletionPage })));
const ReconciliationPage = lazy(() => import('@/pages/ReconciliationPage').then(m => ({ default: m.ReconciliationPage })));
const TimesheetApprovalsPage = lazy(() => import('@/pages/TimesheetApprovalsPage').then(m => ({ default: m.TimesheetApprovalsPage })));
const ProfilePage = lazy(() => import('@/pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const PlannerPage = lazy(() => import('@/pages/PlannerPage').then(m => ({ default: m.PlannerPage })));
const AssetsPage = lazy(() => import('@/pages/AssetsPage').then(m => ({ default: m.AssetsPage })));
const AuditsPage = lazy(() => import('@/pages/AuditsPage').then(m => ({ default: m.AuditsPage })));
const AttendancePage = lazy(() => import('@/pages/AttendancePage').then(m => ({ default: m.AttendancePage })));
const AuthCallback = lazy(() => import('@/components/auth/AuthCallback').then(m => ({ default: m.AuthCallback })));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-screen bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-sm text-slate-500">Loading module...</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/auth/reset-password" element={<AuthCallback />} />
          
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <AppLayout />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/calendar" replace />} />
              <Route path="audits" element={
                <Suspense fallback={<PageLoader />}><AuditsPage /></Suspense>
              } />

            <Route path="attendance" element={
              <ProtectedRoute allowedRoles={['admin', 'super_admin', 'manager', 'hr']}>
                <AttendancePage />
              </ProtectedRoute>
            } />
            <Route path="calendar" element={
              <Suspense fallback={<PageLoader />}><CalendarPage /></Suspense>
            } />
            <Route path="profile" element={
              <Suspense fallback={<PageLoader />}><ProfilePage /></Suspense>
            } />
            <Route path="completion" element={
              <Suspense fallback={<PageLoader />}><CompletionPage /></Suspense>
            } />
            
            {/* Planner routes */}
            <Route
              path="planner"
              element={
                <ProtectedRoute allowedRoles={['planner', 'manager', 'client_head', 'admin', 'super_admin']}>
                  <Suspense fallback={<PageLoader />}><PlannerPage /></Suspense>
                </ProtectedRoute>
              }
            />

            {/* Dashboard available to all users */}
            <Route
              path="dashboard"
              element={
                <Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>
              }
            />

            <Route
              path="approvals"
              element={
                <ProtectedRoute allowedRoles={['admin', 'super_admin', 'manager']}>
                  <Suspense fallback={<PageLoader />}><TimesheetApprovalsPage /></Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="assets"
              element={
                <Suspense fallback={<PageLoader />}><AssetsPage /></Suspense>
              }
            />

            {/* Finance routes */}
            <Route
              path="billing"
              element={
                <ProtectedRoute allowedRoles={['finance', 'super_admin', 'admin', 'manager']}>
                  <Suspense fallback={<PageLoader />}><BillingPage /></Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="man-days"
              element={
                <ProtectedRoute allowedRoles={['finance', 'super_admin', 'admin', 'manager', 'hr']}>
                  <Suspense fallback={<PageLoader />}><ManDaysPage /></Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="reconciliation"
              element={
                <ProtectedRoute allowedRoles={['finance', 'super_admin', 'admin', 'manager']}>
                  <Suspense fallback={<PageLoader />}><ReconciliationPage /></Suspense>
                </ProtectedRoute>
              }
            />
            
            {/* Admin routes combined to prevent remounting */}
            <Route
              path="admin/:tab?"
              element={
                <ProtectedRoute allowedRoles={['admin', 'super_admin', 'hr', 'manager', 'client_head']}>
                  <Suspense fallback={<PageLoader />}><AdminPage /></Suspense>
                </ProtectedRoute>
              }
            />

            {/* Super Admin routes */}
            <Route
              path="admin/command-center"
              element={
                <ProtectedRoute requiredRole="super_admin">
                  <Suspense fallback={<PageLoader />}><CommandPage /></Suspense>
                </ProtectedRoute>
              }
            />
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </ErrorBoundary>
  );
}
