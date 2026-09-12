import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { Loader2, Users, Activity, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export function SuperAdminCommandCenter() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const { count: pendingUsers } = await supabase.from('profiles').select('id', { count: 'exact' }).eq('status', 'pending');
      const { count: totalUsers } = await supabase.from('profiles').select('id', { count: 'exact' });
      const { count: recentAudits } = await supabase.from('audit_logs').select('id', { count: 'exact' }).gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
      const { count: totalAllocations } = await supabase.from('allocations').select('id', { count: 'exact' });
      
      setStats({
        pendingUsers: pendingUsers || 0,
        totalUsers: totalUsers || 0,
        recentAudits: recentAudits || 0,
        totalAllocations: totalAllocations || 0
      });
      setLoading(false);
    }
    fetchStats();
  }, []);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="flex flex-col h-full bg-slate-50/30 p-6 overflow-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Command Center</h2>
        <p className="text-sm text-slate-500 mt-1">System health, pending approvals, and global overview.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className={stats.pendingUsers > 0 ? "border-amber-200 bg-amber-50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Users className={`h-4 w-4 ${stats.pendingUsers > 0 ? "text-amber-600" : "text-slate-500"}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">Users waiting for access</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">Active and inactive</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Recent Audit Events</CardTitle>
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentAudits}</div>
            <p className="text-xs text-muted-foreground mt-1">In the last 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Allocations</CardTitle>
            <Activity className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAllocations}</div>
            <p className="text-xs text-muted-foreground mt-1">Active allocation records</p>
          </CardContent>
        </Card>
      </div>

      <h3 className="text-lg font-medium mb-4">Quick Links</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/admin/roles">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4"/> Role Alignment</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Manage role hierarchies and elevate users to Super Admin.</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/admin/audit-log">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4"/> Audit Log</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Review system-wide changes, rate adjustments, and role updates.</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/admin/database">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500"/> Database Maintenance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Archive old records to maintain optimal query performance.</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
