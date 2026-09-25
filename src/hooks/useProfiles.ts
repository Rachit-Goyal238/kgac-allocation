import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Profile, UserRole, Department } from '@/lib/types';
import { toast } from 'sonner';

export function useDepartments() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('departments').select('*').order('name');
      if (error) throw error;
      return data as Department[];
    }
  });
}

export function useProfiles(filters?: { departmentId?: string; role?: UserRole; status?: string; search?: string }) {
  return useQuery({
    queryKey: ['profiles', filters],
    queryFn: async () => {
      let query = supabase.from('profiles').select('*, department:departments(*)');
      
      if (filters?.departmentId) query = query.eq('department_id', filters.departmentId);
      if (filters?.role) query = query.eq('role', filters.role);
      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.search) query = query.ilike('full_name', `%${filters.search}%`);
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Profile[];
    }
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (updates: Partial<Profile> & { id: string }) => {
      const { error } = await supabase.from('profiles').update(updates).eq('id', updates.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      toast.success('Profile updated');
    },
    onError: (error) => {
      toast.error(`Update failed: ${error.message}`);
    }
  });
}

export function useBulkInsertProfiles() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (profiles: any[]) => {
      // Use the new secure RPC to insert placeholder auth users and profiles
      const { error } = await supabase.rpc('bulk_import_employees', { employees: profiles });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      toast.success('Users imported successfully');
    },
    onError: (error: any) => {
      toast.error(`Import failed: ${error.message}`);
    }
  });
}
