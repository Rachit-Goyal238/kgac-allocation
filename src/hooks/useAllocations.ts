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
            const dayAlloc = userAllocs.find(a => a.allocation_date === dateStr);
            return {
               date: dateStr,
               allocations: dayAlloc ? [dayAlloc] : [],
               totalHours: dayAlloc ? dayAlloc.hours : 0,
            };
         });
         const weeklyTotal = cells.reduce((sum, c) => sum + c.totalHours, 0);
         const utilization = calculateUtilization(weeklyTotal, workingDayCount);
         
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

