import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { DashboardMetrics, IdleDayEntry, OverAllocationEntry, Profile, Allocation } from '@/lib/types';
import { eachDayOfInterval, parseISO, format, getISOWeek, getYear } from 'date-fns';

export function useDashboardMetrics(startDate: string, endDate: string, departmentId?: string, zone?: string) {
  return useQuery({
    queryKey: ['dashboard_metrics', startDate, endDate, departmentId, zone],
    queryFn: async () => {
      // Fetch profiles
      let profilesQuery = supabase.from('profiles').select('*').eq('status', 'active');
      if (departmentId) {
        profilesQuery = profilesQuery.eq('department_id', departmentId);
      }
      if (zone) {
        profilesQuery = profilesQuery.eq('zone', zone);
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

      // Calculate all days and working days (Mon-Sat)
      const days = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) });
      const allDays = days.map(d => format(d, 'yyyy-MM-dd'));
      const workingDays = days.filter(d => d.getDay() !== 0).map(d => format(d, 'yyyy-MM-dd'));

      const activeHeadcount = profiles.length;
      
      let totalLoggedHours = 0;
      let totalCapacityHours = 0;
      
      const allocsByDate: Record<string, { billable: number; internal: number; pto: number }> = {};
      allDays.forEach(d => { allocsByDate[d] = { billable: 0, internal: 0, pto: 0 }; });

      const userAllocs: Record<string, Record<string, { hours: number, status: string }>> = {};
      profiles.forEach(p => {
        userAllocs[p.id] = {};
        allDays.forEach(d => { userAllocs[p.id][d] = { hours: 0, status: 'none' }; });
      });

      (allocations as Allocation[]).forEach(a => {
        const aDate = a.allocation_date || a.date || '';
        if (allDays.includes(aDate) && userAllocs[a.user_id]) {
          userAllocs[a.user_id][aDate].hours += a.hours;
          
          // prioritize leave status if multiple exist for the day
          if (['pto', 'sick', 'public_holiday'].includes(a.status)) {
             userAllocs[a.user_id][aDate].status = a.status;
          } else if (userAllocs[a.user_id][aDate].status === 'none') {
             userAllocs[a.user_id][aDate].status = a.status;
          }
          
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
        let overCountDays = 0;
        
        // Track capacity and hours per ISO week
        const weeklyStats: Record<string, { capacity: number, hours: number }> = {};

        allDays.forEach(d => {
          const { hours, status } = userAllocs[p.id][d];
          const dateObj = parseISO(d);
          const isWeekend = dateObj.getDay() === 0;
          const isLeave = ['pto', 'sick', 'public_holiday'].includes(status);
          
          const weekKey = `${getYear(dateObj)}-W${getISOWeek(dateObj)}`;
          if (!weeklyStats[weekKey]) {
            weeklyStats[weekKey] = { capacity: 0, hours: 0 };
          }
          
          weeklyStats[weekKey].hours += hours;
          
          // Capacity logic matches grid: exclude Sundays and Leave days
          if (!isWeekend && !isLeave) {
             weeklyStats[weekKey].capacity += 8;
             totalCapacityHours += 8; // Global capacity for dashboard team utilization
          }

          // Idle day logic: working day (Mon-Sat), not on leave, 0 hours logged
          if (!isWeekend && !isLeave && hours === 0) {
            idleCount++;
          }
          
          // Over-allocated single day logic: > 8h
          if (hours > 8) {
             overCountDays++;
          }
        });

        // Check if they exceeded their capacity in ANY week
        let exceededWeeklyCapacity = false;
        Object.values(weeklyStats).forEach(stat => {
          if (stat.hours > stat.capacity) {
            exceededWeeklyCapacity = true;
          }
        });

        const isOverAllocated = overCountDays > 0 || exceededWeeklyCapacity;

        if (isOverAllocated) {
          overAllocatedCount++;
          const maxH = Math.max(...allDays.map(d => userAllocs[p.id][d].hours));
          overAllocationEntries.push({
            userId: p.id,
            employee: p as Profile,
            profile: p as Profile,
            overAllocatedDays: overCountDays > 0 ? overCountDays : 1, // at least 1 for exceeding weekly capacity
            maxHoursInDay: maxH > 8 ? maxH : 8 // show max hours or 8 if it's purely a weekly overage
          });
        }

        if (idleCount > 0) {
          totalIdleDays += idleCount;
          idleDayEntries.push({
            userId: p.id,
            employee: p as Profile,
            profile: p as Profile,
            idleDayCount: idleCount,
            lastActiveDate: [...allDays].reverse().find(d => userAllocs[p.id][d].hours > 0) || null
          });
        }
      });

      const teamUtilization = totalCapacityHours > 0 ? (totalLoggedHours / totalCapacityHours) * 100 : 0;

      const dailyUtilization = workingDays.map(date => {
        const total = allocsByDate[date].billable + allocsByDate[date].internal + allocsByDate[date].pto;
        const capacity = activeHeadcount * 8; // Simplified daily capacity for chart
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
    },
    enabled: true // will fetch on mount
  });
}
