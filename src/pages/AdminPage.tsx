import React, { lazy, Suspense } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserManagement } from '@/components/admin/UserManagement';

import { SeedDataToggle } from '@/components/admin/SeedDataToggle';
import { DepartmentManager } from '@/components/admin/DepartmentManager';
import { ProjectManager } from '@/components/admin/ProjectManager';
import { useAuthContext } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

const AuditLogViewer = lazy(() => import('@/components/admin/AuditLogViewer').then(m => ({ default: m.AuditLogViewer })));
const ClientManager = lazy(() => import('@/components/admin/ClientManager').then(m => ({ default: m.ClientManager })));
const DatabaseMaintenance = lazy(() => import('@/components/admin/DatabaseMaintenance').then(m => ({ default: m.DatabaseMaintenance })));
const VendorManager = lazy(() => import('@/components/admin/VendorManager').then(m => ({ default: m.VendorManager })));

function TabLoader() {
  return (
    <div className="flex items-center justify-center p-12">
      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
    </div>
  );
}

import { hasRole, hasAnyRole } from '@/lib/utils';

export function AdminPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuthContext();
  const roles = profile?.roles || [];
  const isSuperAdmin = hasRole(roles, 'super_admin');
  const isAdminPlus = hasAnyRole(roles, ['admin', 'super_admin']);
  const isManagerPlus = hasAnyRole(roles, ['manager', 'admin', 'super_admin']);
  const isClientHead = hasRole(roles, 'client_head');
  
  // Determine active tab from URL path
  let activeTab = 'users';
  if (location.pathname.includes('/admin/departments')) activeTab = 'departments';
  if (location.pathname.includes('/admin/projects')) activeTab = 'projects';
  if (location.pathname.includes('/admin/vendors')) activeTab = 'vendors';
  if (location.pathname.includes('/admin/clients')) activeTab = 'clients';
  if (location.pathname.includes('/admin/settings')) activeTab = 'settings';
  if (location.pathname.includes('/admin/roles')) activeTab = 'roles';
  if (location.pathname.includes('/admin/audit-log')) activeTab = 'audit-log';
  if (location.pathname.includes('/admin/database')) activeTab = 'database';

  const handleTabChange = (value: string) => {
    navigate(`/admin/${value}`);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/30 p-6 overflow-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Administration</h2>
        <p className="text-sm text-slate-500 mt-1">Manage users, departments, projects, clients, and system settings.</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          <TabsTrigger value="users">Users & Roles</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          {isManagerPlus && <TabsTrigger value="projects">Projects</TabsTrigger>}
          {isAdminPlus && <TabsTrigger value="vendors">Vendors</TabsTrigger>}
          {(isAdminPlus || isClientHead) && <TabsTrigger value="clients">Clients</TabsTrigger>}
          {isAdminPlus && <TabsTrigger value="settings">Settings</TabsTrigger>}
          {isSuperAdmin && <TabsTrigger value="audit-log">Audit Log</TabsTrigger>}
          {isSuperAdmin && <TabsTrigger value="database">Database</TabsTrigger>}
        </TabsList>
        
        <TabsContent value="users" className="mt-0">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <UserManagement />
          </div>
        </TabsContent>

        <TabsContent value="departments" className="mt-0">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <DepartmentManager />
          </div>
        </TabsContent>

        {isManagerPlus && (
          <TabsContent value="projects" className="mt-0">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <ProjectManager />
            </div>
          </TabsContent>
        )}

        {isAdminPlus && (
          <TabsContent value="vendors" className="mt-0">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <Suspense fallback={<TabLoader />}>
                <VendorManager />
              </Suspense>
            </div>
          </TabsContent>
        )}

        {(isAdminPlus || isClientHead) && (
          <TabsContent value="clients" className="mt-0">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <Suspense fallback={<TabLoader />}>
                <ClientManager />
              </Suspense>
            </div>
          </TabsContent>
        )}
        
        {isAdminPlus && (
          <TabsContent value="settings" className="mt-0">
            <div className="bg-white rounded-lg shadow-sm border p-6 max-w-2xl">
              <h3 className="text-lg font-medium mb-4">Development Tools</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Use these tools to populate or clear demo data. This is useful for testing the dashboard and grid views.
              </p>
              <SeedDataToggle />
            </div>
          </TabsContent>
        )}



        {isSuperAdmin && (
          <TabsContent value="audit-log" className="mt-0">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <Suspense fallback={<TabLoader />}>
                <AuditLogViewer />
              </Suspense>
            </div>
          </TabsContent>
        )}

        {isSuperAdmin && (
          <TabsContent value="database" className="mt-0">
            <div className="bg-white rounded-lg shadow-sm border p-6 max-w-4xl">
              <Suspense fallback={<TabLoader />}>
                <DatabaseMaintenance />
              </Suspense>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
