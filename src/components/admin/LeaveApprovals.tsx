import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { LeaveRequest } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Loader2, Check, X } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';

export function LeaveApprovals() {
  const { profile } = useAuthContext();
  const queryClient = useQueryClient();

  const { data: requests, isLoading, error } = useQuery({
    queryKey: ['leave_requests_manager', profile?.id, profile?.roles],
    queryFn: async () => {
      const isAdmin = profile?.roles?.some(r => r === 'admin' || r === 'super_admin' || r === 'hr');
      const isManager = profile?.roles?.some(r => r === 'manager');
      
      let query = supabase
        .from('leave_requests')
        .select(`
          *,
          profile:profiles!leave_requests_user_id_fkey(full_name, email)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (!isAdmin) {
        if (isManager && profile?.department_id) {
          // Manager can see leaves for anyone in their department
          const { data: deptProfiles } = await supabase
            .from('profiles')
            .select('id')
            .eq('department_id', profile.department_id);
            
          const userIds = deptProfiles?.map(p => p.id) || [];
          if (userIds.length > 0) {
            query = query.in('user_id', userIds);
          } else {
            // No users in department? Query nothing.
            query = query.eq('user_id', '00000000-0000-0000-0000-000000000000');
          }
        } else {
          // Fallback to explicit manager_id
          query = query.eq('manager_id', profile?.id);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, request }: { id: string, status: 'approved' | 'rejected', request?: any }) => {
      const { error } = await supabase
        .from('leave_requests')
        .update({ status })
        .eq('id', id);
      
      if (error) throw error;

      if (status === 'approved' && request) {
        // Create allocations for the date range
        import('date-fns').then(async ({ eachDayOfInterval, format, parseISO }) => {
          const days = eachDayOfInterval({ 
            start: parseISO(request.start_date), 
            end: parseISO(request.end_date) 
          });
          
          const dateStrings = days.map(d => format(d, 'yyyy-MM-dd'));

          // Delete any existing allocations for these days
          const { error: deleteError } = await supabase
            .from('allocations')
            .delete()
            .eq('user_id', request.user_id)
            .in('allocation_date', dateStrings);
            
          if (deleteError) {
            console.error('Failed to clear previous allocations for leave:', deleteError);
          }
          
          const allocationsToInsert = dateStrings.map(dateStr => ({
            user_id: request.user_id,
            allocation_date: dateStr,
            hours: 0,
            status: request.type,
            task_status: 'completed', // auto-complete task status for leave
          }));

          // Insert the new leave allocations
          const { error: insertError } = await supabase.from('allocations').insert(allocationsToInsert);
          if (insertError) {
             console.error('Failed to insert leave allocations:', insertError);
             toast.error('Failed to apply leave to calendar. ' + insertError.message);
          } else {
             queryClient.invalidateQueries({ queryKey: ['allocations'] });
          }
        });
      }

      return { id, status };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave_requests_manager'] });
      toast.success('Leave request updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update request');
    }
  });

  if (isLoading) {
    return <div className="flex h-32 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Leave Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-red-500">Error loading leave requests: {(error as Error).message}</div>
        </CardContent>
      </Card>
    );
  }

  if (!requests || requests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Leave Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">No pending leave requests to approve.</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leave Approvals</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {requests.map((request: any) => (
            <div key={request.id} className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <div className="font-medium">{request.profile?.full_name}</div>
                <div className="text-sm text-muted-foreground">
                  {format(new Date(request.start_date), 'MMM d, yyyy')} - {format(new Date(request.end_date), 'MMM d, yyyy')}
                </div>
                <Badge variant={request.type === 'sick' ? 'destructive' : 'secondary'} className="mt-2">
                  {request.type === 'sick' ? 'Sick Leave' : 'PTO'}
                </Badge>
              </div>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => updateStatus.mutate({ id: request.id, status: 'rejected', request })}
                  disabled={updateStatus.isPending}
                >
                  <X className="mr-1 h-4 w-4" /> Reject
                </Button>
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => updateStatus.mutate({ id: request.id, status: 'approved', request })}
                  disabled={updateStatus.isPending}
                >
                  <Check className="mr-1 h-4 w-4" /> Approve
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
