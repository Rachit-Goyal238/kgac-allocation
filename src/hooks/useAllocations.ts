import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Allocation, GridFilters, GridRow, Profile } from '@/lib/types';
import { useAuthContext } from '@/contexts/AuthContext';
import { calculateUtilization, formatDate, hasRole, hasAnyRole } from '@/lib/utils';
import { eachDayOfInterval, format, parseISO, isWeekend } from 'date-fns';
import { toast } from 'sonner';
import { WORK_HOURS_PER_DAY } from '@/lib/constants';

function getStartDate(filters: GridFilters): string {
  return filters.startDate || filters.dateRange?.start || format(new Date(), 'yyyy-MM-dd');
}

function getEndDate(filters: GridFilters): string {
  return filters.endDate || filters.dateRange?.end || format(new Date(), 'yyyy-MM-dd');
}

export function useAllocationsQuery(filters: GridFilters) {
  const { profile } = useAuthContext();
  
  return useQuery({
    queryKey: ['allocations', filters, profile?.id],
    queryFn: async () => {
      if (!profile) return { allocations: [], profiles: [], gridRows: [] };
      
      let profilesQuery = supabase.from('profiles').select('*').eq('status', 'active');
      
      const roles = profile.roles || [];
      // Admin, Super Admin, Manager, and Planner get global view
      const hasGlobalView = hasAnyRole(roles, ['admin', 'super_admin', 'manager', 'planner']);
      
      if (!hasGlobalView) {
        profilesQuery = profilesQuery.eq('id', profile.id);
      }
      
      if (filters.departmentId && hasGlobalView) {
         profilesQuery = profilesQuery.eq('department_id', filters.departmentId);
      }
      if (filters.searchQuery) {
         profilesQuery = profilesQuery.ilike('full_name', `%${filters.searchQuery}%`);
      }
      
      const { data: profilesData, error: profilesError } = await profilesQuery;
      if (profilesError) throw profilesError;
      
      const userIds = profilesData.map(p => p.id);
      if (userIds.length === 0) return { allocations: [], profiles: profilesData as Profile[], gridRows: [] };

      const startDate = getStartDate(filters);
      const endDate = getEndDate(filters);
      
      const { data: allocationsData, error: allocError } = await supabase
        .from('allocations')
        .select('*')
        .in('user_id', userIds)
        .gte('allocation_date', startDate)
        .lte('allocation_date', endDate);
        
      if (allocError) throw allocError;
      
      const allocations = allocationsData as Allocation[];
      const profiles = profilesData as Profile[];
      
      const days = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) });
      const workingDayCount = days.filter(d => d.getDay() !== 0).length;

      const gridRows: GridRow[] = profiles.map(p => {
         const userAllocs = allocations.filter(a => a.user_id === p.id);
         const cells = days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayAllocs = userAllocs.filter(a => a.allocation_date === dateStr);
            const totalHours = dayAllocs.reduce((sum, a) => sum + Number(a.hours || 0), 0);
            return {
               date: dateStr,
               allocations: dayAllocs,
               totalHours: totalHours,
            };
         });
         let workingCapacity = 0;
         cells.forEach(c => {
           const d = parseISO(c.date);
           const isWeekend = d.getDay() === 0; // Sunday is 0
           const alloc = c.allocations[0];
           const isLeave = alloc && (alloc.status === 'pto' || alloc.status === 'sick');
           
           if (!isWeekend && !isLeave) {
             workingCapacity += WORK_HOURS_PER_DAY;
           }
         });
         
         const weeklyTotal = cells.reduce((sum, c) => sum + c.totalHours, 0);
         const utilization = workingCapacity > 0 ? Math.round((weeklyTotal / workingCapacity) * 100) : 0;
         
         // Build allocations record keyed by date
         const allocRecord: Record<string, Allocation | null> = {};
         cells.forEach(c => {
           allocRecord[c.date] = c.allocations[0] || null;
         });
         
         return {
            user: p,
            employee: p,
            cells,
            allocations: allocRecord,
            weeklyTotal,
            totalHours: weeklyTotal,
            utilization,
         };
      });
      
      return { allocations, profiles, gridRows };
    },
    enabled: !!profile
  });
}

export function useUpsertAllocation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (allocation: Partial<Allocation>) => {
      const { data, error } = await supabase
        .from('allocations')
        .upsert(allocation, { onConflict: 'user_id,allocation_date' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['allocations'] });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allocations'] });
      toast.success('Allocation saved');
    },
    onError: (error) => {
      toast.error(`Failed to save: ${error.message}`);
    }
  });
}

export function useDeleteAllocation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('allocations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allocations'] });
      toast.success('Allocation deleted');
    }
  });
}


export function useSaveDayAllocations() {
  const queryClient = useQueryClient();
  const { profile } = useAuthContext();
  
  return useMutation({
    mutationFn: async ({ userId, date, allocations }: { userId: string, date: string, allocations: Partial<Allocation>[] }) => {
      // Find existing to preserve PTO/Sick
      const { data: existing } = await supabase.from('allocations').select('*').eq('user_id', userId).eq('allocation_date', date);
      const leave = existing?.find(a => a.status === 'pto' || a.status === 'sick');
      
      const isManagerOrAdmin = profile?.roles?.some(r => ['admin', 'super_admin', 'manager', 'planner'].includes(r));
      
      if (leave && !isManagerOrAdmin) {
         throw new Error('Cannot overwrite a leave day from the grid.');
      }

      const { error: deleteError } = await supabase.from('allocations').delete().eq('user_id', userId).eq('allocation_date', date);
      if (deleteError) throw deleteError;
      
      if (allocations.length > 0) {
        const toInsert = allocations.map((a: any) => {
          delete a.id;
          return {
            ...a,
            user_id: userId,
            allocation_date: date
          };
        });
        const { error } = await supabase.from('allocations').insert(toInsert);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allocations'] });
      toast.success('Day saved');
    },
    onError: (error: any) => {
      toast.error('Failed to save: ' + error.message);
    }
  });
}


