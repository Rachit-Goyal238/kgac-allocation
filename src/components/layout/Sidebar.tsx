import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ENABLE_ATTENDANCE_SYSTEM } from '@/lib/constants';
import { useState, useEffect } from 'react';
import { Clock, ClipboardCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import { hasRole, hasAnyRole } from '@/lib/utils';
import { ROLE_LABELS } from '@/lib/constants';
import { 
  CalendarDays, 
  BarChart3, 
  Users, 
  CalendarOff, 
  Settings,
  LogOut,
  Building2,
  FolderKanban,
  DollarSign,
  Activity,
  CheckCircle2,
  Shield,
  ClipboardList,
  Database,
  Calculator,
  Monitor,
  CheckSquare
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface SidebarProps {
  onClose?: () => void;
}

const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
  `flex items-center rounded-md px-3 py-2 text-sm font-medium ${
    isActive
      ? 'bg-blue-50 text-blue-700'
      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
  }`;

export function Sidebar({ onClose }: SidebarProps) {
  const { profile, signOut } = useAuthContext();
  const { unreadCount } = useNotifications();

  const handleLinkClick = () => {
    if (onClose) onClose();
  };

  const roles = profile?.roles || [];
  const isManagerPlus = hasAnyRole(roles, ['manager', 'admin', 'super_admin']);
  const isFinance = hasRole(roles, 'finance');
  const isAdminPlus = hasAnyRole(roles, ['admin', 'super_admin']);
  const isSuperAdmin = hasRole(roles, 'super_admin');
  const isHR = hasAnyRole(roles, ['hr', 'admin', 'super_admin']);
  const isClientHead = hasRole(roles, 'client_head');

  return (
    <div className="flex h-full flex-col border-r border-slate-200/60 bg-white/95 backdrop-blur-sm">
      <div className="flex h-16 items-center px-6 gap-3">
        <img src="/logo.png" alt="KGAC Logo" className="h-8 w-auto object-contain" />
        <h2 className="text-lg font-bold tracking-tight text-gray-900">
          Team Allocation
        </h2>
      </div>
      
      <Separator />

      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-3">
          {/* Calendar - all roles */}
          <NavLink to="/calendar" onClick={handleLinkClick} className={navLinkClasses}>
            <CalendarDays className="mr-3 h-5 w-5 flex-shrink-0" />
            Calendar
          </NavLink>

          {/* Planner - Planner, Manager, Client Head, Admin, Super Admin */}
          {hasAnyRole(roles, ['planner', 'manager', 'client_head', 'admin', 'super_admin']) && (
            <NavLink to="/planner" onClick={handleLinkClick} className={navLinkClasses}>
              <ClipboardList className="mr-3 h-5 w-5 flex-shrink-0" />
              Audit Planner
            </NavLink>
          )}

          {/* Dashboard - All users */}
          <NavLink to="/audits" onClick={handleLinkClick} className={navLinkClasses}>
            <ClipboardCheck className="mr-3 h-5 w-5 flex-shrink-0" />
            All Audits
          </NavLink>
          
          <NavLink to="/dashboard" onClick={handleLinkClick} className={navLinkClasses}>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center">
                <BarChart3 className="mr-3 h-5 w-5 flex-shrink-0" />
                Dashboard
              </div>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
          </NavLink>

          {/* Assets - All users */}
          <NavLink to="/assets" onClick={handleLinkClick} className={navLinkClasses}>
            <Monitor className="mr-3 h-5 w-5 flex-shrink-0" />
            Internal Assets
          </NavLink>
          
          {hasAnyRole(roles, ['admin', 'super_admin', 'manager', 'hr']) && (
            <NavLink to="/attendance" onClick={handleLinkClick} className={navLinkClasses}>
              <Clock className="mr-3 h-5 w-5 flex-shrink-0" />
              Attendance
            </NavLink>
          )}

          {/* Audit Margins - Manager, Admin, Super Admin, Finance */}
          {(isManagerPlus || isFinance) && (
            <NavLink to="/reconciliation" onClick={handleLinkClick} className={navLinkClasses}>
              <Calculator className="mr-3 h-5 w-5 flex-shrink-0" />
              Audit Margins
            </NavLink>
          )}

          {/* Completion Tracker - Manager, Admin, Super Admin */}
          {isManagerPlus && (
            <NavLink to="/completion" onClick={handleLinkClick} className={navLinkClasses}>
              <CheckCircle2 className="mr-3 h-5 w-5 flex-shrink-0" />
              Completion
            </NavLink>
          )}

          {isManagerPlus && (
            <NavLink to="/approvals" onClick={handleLinkClick} className={navLinkClasses}>
              <CheckSquare className="mr-3 h-5 w-5 flex-shrink-0 text-emerald-600" />
              Timesheet Approvals
            </NavLink>
          )}

          {/* Billing Section - Finance, Manager, Admin, Super Admin, HR */}
          {(isManagerPlus || isFinance || isHR) && (
            <>
              <div className="mt-6 mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Billing & Reports
              </div>

              {(isManagerPlus || isFinance) && (
                <NavLink to="/billing" onClick={handleLinkClick} className={navLinkClasses}>
                  <DollarSign className="mr-3 h-5 w-5 flex-shrink-0" />
                  Expense Billing
                </NavLink>
              )}

              <NavLink to="/man-days" onClick={handleLinkClick} className={navLinkClasses}>
                <Activity className="mr-3 h-5 w-5 flex-shrink-0" />
                Man-Days
              </NavLink>
            </>
          )}

          {/* Admin Section */}
          {(isManagerPlus || isHR || isClientHead) && (
            <>
              <div className="mt-6 mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Admin
              </div>
              
              {(isAdminPlus || isHR) && (
                <NavLink to="/admin/users" onClick={handleLinkClick} className={navLinkClasses}>
                  <Users className="mr-3 h-5 w-5 flex-shrink-0" />
                  Users & Roles
                </NavLink>
              )}

              {(isAdminPlus || isHR) && (
                <NavLink to="/admin/departments" onClick={handleLinkClick} className={navLinkClasses}>
                  <Building2 className="mr-3 h-5 w-5 flex-shrink-0" />
                  Departments
                </NavLink>
              )}

              {isManagerPlus && (
                <NavLink to="/admin/projects" onClick={handleLinkClick} className={navLinkClasses}>
                  <FolderKanban className="mr-3 h-5 w-5 flex-shrink-0" />
                  Projects
                </NavLink>
              )}

              {isAdminPlus && (
                <NavLink to="/admin/vendors" onClick={handleLinkClick} className={navLinkClasses}>
                  <Users className="mr-3 h-5 w-5 flex-shrink-0" />
                  Vendors
                </NavLink>
              )}

              {(isAdminPlus || isClientHead) && (
                <NavLink to="/admin/clients" onClick={handleLinkClick} className={navLinkClasses}>
                  <Building2 className="mr-3 h-5 w-5 flex-shrink-0" />
                  Clients
                </NavLink>
              )}

              {isAdminPlus && (
                <NavLink to="/admin/settings" onClick={handleLinkClick} className={navLinkClasses}>
                  <Settings className="mr-3 h-5 w-5 flex-shrink-0" />
                  Settings
                </NavLink>
              )}
            </>
          )}

          {/* Super Admin Section */}
          {isSuperAdmin && (
            <>
              <div className="mt-6 mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Super Admin
              </div>

              <NavLink to="/admin/command-center" onClick={handleLinkClick} className={navLinkClasses}>
                <Shield className="mr-3 h-5 w-5 flex-shrink-0" />
                Command Center
              </NavLink>

              <NavLink to="/admin/audit-log" onClick={handleLinkClick} className={navLinkClasses}>
                <ClipboardList className="mr-3 h-5 w-5 flex-shrink-0" />
                Audit Log
              </NavLink>

              <NavLink to="/admin/database" onClick={handleLinkClick} className={navLinkClasses}>
                <Database className="mr-3 h-5 w-5 flex-shrink-0" />
                Database Maintenance
              </NavLink>
            </>
          )}
        </nav>
      </div>

      <Separator />

      <div className="p-4 space-y-2">
        <NavLink to="/profile" onClick={handleLinkClick} className={navLinkClasses}>
          <Settings className="mr-3 h-5 w-5 flex-shrink-0" />
          My Profile
        </NavLink>
        
        <div className="flex items-center px-3 pt-2 mt-2 border-t">
          <Avatar className="h-9 w-9">
            <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || ''} />
            <AvatarFallback>{profile?.full_name?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
          </Avatar>
          <div className="ml-3 flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium text-gray-900">
              {profile?.full_name || 'User'}
            </p>
            <div className="flex flex-wrap gap-1 mt-1">
              <Badge variant="outline" className="text-[9px] font-bold uppercase border-indigo-200 bg-indigo-50 text-indigo-700">
                {profile?.entity || 'None'}
              </Badge>
              {(profile?.roles && profile.roles.length > 0) ? (
                [...profile.roles].sort((a, b) => {
                  const hierarchy = ['super_admin', 'admin', 'manager', 'client_head', 'planner', 'finance', 'hr', 'employee', 'audit_executive', 'backend_staff'];
                  const indexA = hierarchy.indexOf(a);
                  const indexB = hierarchy.indexOf(b);
                  return (indexA > -1 ? indexA : 99) - (indexB > -1 ? indexB : 99);
                }).map(role => (
                  <Badge key={role} variant="secondary" className="text-[9px] uppercase">
                    {ROLE_LABELS[role as keyof typeof ROLE_LABELS] || role}
                  </Badge>
                ))
              ) : (
                <Badge variant="secondary" className="text-[9px] uppercase">Audit Exec</Badge>
              )}
            </div>
          </div>
        </div>
        
        {ENABLE_ATTENDANCE_SYSTEM && <ClockOutButton user={profile} />}
        <Button 
          variant="ghost" 
          className="mt-4 w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700" 
          onClick={signOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  );
}

function ClockOutButton({ user }: { user: any }) {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];
  const [elapsed, setElapsed] = useState('');

  const { data: attendance } = useQuery({
    queryKey: ['attendance', user?.id, today],
    queryFn: async () => {
      const { data } = await supabase.from('attendance').select('*').eq('user_id', user?.id).eq('date', today).maybeSingle();
      return data;
    },
    enabled: !!user?.id
  });

  useEffect(() => {
    if (!attendance || !attendance.clock_in || attendance.clock_out) return;
    
    const interval = setInterval(() => {
      const start = new Date(attendance.clock_in).getTime();
      const now = new Date().getTime();
      const diff = now - start;
      
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      
      setElapsed(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [attendance]);

  const clockOut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('attendance').update({ clock_out: new Date().toISOString() }).eq('id', attendance?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    }
  });

  if (!attendance || attendance.clock_out) return null;

  return (
    <div className="flex flex-col space-y-2 mb-4 p-3 bg-slate-800 rounded-lg border border-slate-700">
      <div className="flex justify-between items-center text-slate-300 text-sm">
        <span className="flex items-center"><Clock className="w-4 h-4 mr-2 text-emerald-400" /> Working</span>
        <span className="font-mono font-medium tracking-wider">{elapsed || '00:00:00'}</span>
      </div>
      <Button 
        variant="outline" 
        className="w-full text-amber-500 hover:text-amber-600 hover:bg-amber-50/10 border-slate-600 bg-transparent h-8 text-xs" 
        onClick={() => { if(confirm('Are you sure you want to clock out for the day?')) clockOut.mutate(); }}
        disabled={clockOut.isPending}
      >
        Clock Out
      </Button>
    </div>
  );
}
