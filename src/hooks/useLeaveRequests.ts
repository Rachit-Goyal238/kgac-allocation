import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { LeaveRequest } from '@/lib/types';
import { toast } from 'sonner';

export function useMyLeaveRequests(userId?: string) {
  return useQuery({
    queryKey: ['leave_requests', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', userId)
        .order('start_date', { ascending: false });

      if (error) throw error;
      return data as LeaveRequest[];
    },
    enabled: !!userId,
  });
}

export function useCreateLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: Omit<LeaveRequest, 'id' | 'created_at' | 'updated_at' | 'status'>) => {
      let finalManagerId = request.manager_id;
      
      // If the frontend didn't provide a valid manager_id (or provided a department_id instead), 
      // let's look up the actual manager of the user's department.
      if (!finalManagerId || finalManagerId === request.user_id || finalManagerId.length > 0) {
         const { data: profile } = await supabase.from('profiles').select('department_id').eq('id', request.user_id).single();
         if (profile?.department_id) {
           const { data: dept } = await supabase.from('departments').select('manager_id').eq('id', profile.department_id).single();
           if (dept?.manager_id) {
             finalManagerId = dept.manager_id;
           } else {
             finalManagerId = null; // null means admin needs to approve
           }
         } else {
           finalManagerId = null;
         }
      }

      const { data, error } = await supabase
        .from('leave_requests')
        .insert([{ ...request, manager_id: finalManagerId, status: 'pending' }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leave_requests'] });
      toast.success('Leave request submitted for approval');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to submit leave request');
    },
  });
}

