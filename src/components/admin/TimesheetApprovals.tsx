import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export function TimesheetApprovals() {
  const queryClient = useQueryClient();

  const { data: allocations, isLoading } = useQuery({
    queryKey: ['pending_timesheets'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('allocations')
        .select(`
          *,
          profile:profiles!inner(full_name, email, role),
          project:projects(name),
          audit:audits(store_name)
        `)
        .eq('is_approved', false)
        .lte('allocation_date', today)
        .order('allocation_date', { ascending: true });

      if (error) throw error;
      return data;
    }
  });

  const approveMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('allocations')
        .update({ is_approved: true })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending_timesheets'] });
      queryClient.invalidateQueries({ queryKey: ['allocations'] });
      toast.success('Timesheets approved successfully');
    },
    onError: (err: any) => toast.error(err.message)
  });

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-6 w-6 text-slate-400" /></div>;

  // Group by user
  const grouped = (allocations || []).reduce((acc: any, curr: any) => {
    const userId = curr.user_id;
    if (!acc[userId]) {
      acc[userId] = {
        user: curr.profile,
        records: []
      };
    }
    acc[userId].records.push(curr);
    return acc;
  }, {});

  const users = Object.values(grouped) as any[];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Timesheet Approvals</CardTitle>
        <CardDescription>Review and approve logged hours before they impact billing.</CardDescription>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <div className="text-center p-8 text-slate-500">All timesheets up to today are approved.</div>
        ) : (
          <div className="space-y-6">
            {users.map((u, i) => (
              <div key={i} className="border rounded-lg overflow-hidden">
                <div className="bg-slate-50 p-4 border-b flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-slate-900">{u.user.full_name}</h3>
                    <p className="text-sm text-slate-500">{u.user.email} &bull; {u.records.length} pending entries</p>
                  </div>
                  <Button 
                    size="sm" 
                    className="bg-emerald-600 hover:bg-emerald-700"
                    disabled={approveMutation.isPending}
                    onClick={() => approveMutation.mutate(u.records.map((r: any) => r.id))}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Approve All for {u.user.full_name}
                  </Button>
                </div>
                <div className="p-0">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50/50 text-slate-500">
                      <tr>
                        <th className="text-left font-medium p-3">Date</th>
                        <th className="text-left font-medium p-3">Project / Audit</th>
                        <th className="text-left font-medium p-3">Hours</th>
                        <th className="text-left font-medium p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {u.records.map((r: any) => (
                        <tr key={r.id}>
                          <td className="p-3">{format(new Date(r.allocation_date), 'MMM d, yyyy')}</td>
                          <td className="p-3 font-medium">{r.audit?.store_name || r.project?.name || 'Unknown'}</td>
                          <td className="p-3">{r.hours}h</td>
                          <td className="p-3 capitalize">{r.status.replace('_', ' ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
