import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { DashboardMetrics, IdleDayEntry, OverAllocationEntry, Profile, Allocation } from '@/lib/types';
import { eachDayOfInterval, parseISO, format, isWeekend } from 'date-fns';

export function useDashboardMetrics(startDate: string, endDate: string, departmentId?: string) {
  return useQuery({
    queryKey: ['dashboard_metrics', startDate, endDate, departmentId],
    queryFn: async () => {
      // Fetch profiles
      let profilesQuery = supabase.from('profiles').select('*').eq('status', 'active');
      if (departmentId) {
        profilesQuery = profilesQuery.eq('department_id', departmentId);
      }
      const { data: profiles, error: profilesError } = await profilesQuery;
      if (profilesError) throw profilesError;

      const profileIds = (profiles as Profile[]).map(p => p.id);

      // Fetch allocations
      const { data: allocations, error: allocError } = await supabase
        .from('allocations')
        .select('*')
        .in('user_id', profileIds)
        .gte('allocation_date', startDate)
        .lte('allocation_date', endDate);

      if (allocError) throw allocError;

      // Calculate working days
      const days = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) });
      const workingDays = days.filter(d => d.getDay() !== 0).map(d => format(d, 'yyyy-MM-dd'));

      const activeHeadcount = profiles.length;
      const totalCapacityHours = activeHeadcount * workingDays.length * 8;
      
      let totalLoggedHours = 0;
      const allocsByDate: Record<string, { billable: number; internal: number; pto: number }> = {};
      workingDays.forEach(wd => { allocsByDate[wd] = { billable: 0, internal: 0, pto: 0 }; });

      const userAllocs: Record<string, Record<string, number>> = {};
      profiles.forEach(p => {
        userAllocs[p.id] = {};
        workingDays.forEach(wd => { userAllocs[p.id][wd] = 0; });
      });

      (allocations as Allocation[]).forEach(a => {
        const aDate = a.allocation_date || a.date || '';
        if (workingDays.includes(aDate) && userAllocs[a.user_id]) {
          userAllocs[a.user_id][aDate] += a.hours;
          totalLoggedHours += a.hours;

          if (allocsByDate[aDate]) {
            if (a.status === 'billable') allocsByDate[aDate].billable += a.hours;
            else if (['internal'].includes(a.status)) allocsByDate[aDate].internal += a.hours;
            else allocsByDate[aDate].pto += a.hours;
          }
        }
      });

      let totalIdleDays = 0;
      let overAllocatedCount = 0;
      
      const idleDayEntries: IdleDayEntry[] = [];
      const overAllocationEntries: OverAllocationEntry[] = [];

      profiles.forEach(p => {
        let idleCount = 0;
        let overCount = 0;
        let lastActiveDate: string | null = null;

        workingDays.forEach(wd => {
          const hours = userAllocs[p.id][wd];
          if (hours === 0) {
            idleCount++;
          } else {
            lastActiveDate = wd;
            if (hours > 8) {
              overCount++;
            }
          }
        });

        totalIdleDays += idleCount;
        if (overCount > 0) {
          overAllocatedCount++;
          overAllocationEntries.push({
            userId: p.id,
            employee: p as Profile,
            profile: p as Profile,
            overAllocatedDays: overCount,
            maxHoursInDay: Math.max(...workingDays.map(wd => userAllocs[p.id][wd]))
          });
        }

        if (idleCount > 0) {
          idleDayEntries.push({
            userId: p.id,
            employee: p as Profile,
            profile: p as Profile,
            idleDayCount: idleCount,
            idleDaysCount: idleCount,
            lastActiveDate
          });
        }
      });

      idleDayEntries.sort((a, b) => (b.idleDayCount || 0) - (a.idleDayCount || 0));
      overAllocationEntries.sort((a, b) => b.overAllocatedDays - a.overAllocatedDays);

      const teamUtilization = totalCapacityHours > 0 ? (totalLoggedHours / totalCapacityHours) * 100 : 0;

      const dailyUtilization = workingDays.map(date => {
        const total = allocsByDate[date].billable + allocsByDate[date].internal + allocsByDate[date].pto;
        const capacity = activeHeadcount * 8;
        return {
          date,
          billableHours: allocsByDate[date].billable,
          internalHours: allocsByDate[date].internal,
          ptoHours: allocsByDate[date].pto,
          utilization: capacity > 0 ? (total / capacity) * 100 : 0
        };
      });

      const metrics: DashboardMetrics = {
        totalIdleDays,
        teamUtilization,
        overAllocatedCount,
        activeHeadcount,
        totalCapacityHours,
        totalLoggedHours
      };

      return { metrics, idleDayEntries, overAllocationEntries, dailyUtilization };
    }
  });
}
