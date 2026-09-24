import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { WORK_HOURS_PER_DAY } from '@/lib/constants';
import { format } from 'date-fns';

export function useManDaysMetrics(dateRange: { start: Date, end: Date }, zoneFilter?: string) {
  return useQuery({
    queryKey: ['manDaysMetrics', dateRange, zoneFilter],
    queryFn: async () => {
      let query = supabase
        .from('allocations')
        .select('*, projects(name), profiles!inner(zone)')
        .gte('allocation_date', format(dateRange.start, 'yyyy-MM-dd'))
        .lte('allocation_date', format(dateRange.end, 'yyyy-MM-dd'));
        
      if (zoneFilter) {
        query = query.ilike('profiles.zone', `%${zoneFilter}%`);
      }
      
      const { data: allocations, error: allocError } = await query;
      if (allocError) throw allocError;

      // Also fetch external vendor assignments from audit_teams
      const { data: vendorTeams, error: vendorError } = await supabase
        .from('audit_teams')
        .select(`
          id, vendor_id, role,
          audit:audits(id, audit_date, project_id, project:projects(name))
        `)
        .not('vendor_id', 'is', null);
      if (vendorError) throw vendorError;

      let totalManDays = 0;
      let internalManDays = 0;
      let externalManDays = 0;
      const projectMap: Record<string, any> = {};
      const monthMap: Record<string, any> = {};

      allocations?.forEach(a => {
        const manDays = a.hours / WORK_HOURS_PER_DAY;
        // Since V3 doesn't put vendors in profiles, all allocations here are internal
        const isInternal = true; 
        
        totalManDays += manDays;
        internalManDays += manDays;

        const projId = a.project_id || 'unassigned';
        if (!projectMap[projId]) {
           projectMap[projId] = { project_id: projId, project_name: a.projects?.name || 'Unassigned', total: 0, internal: 0, external: 0 };
        }
        projectMap[projId].total += manDays;
        projectMap[projId].internal += manDays;

        const month = new Date(a.allocation_date).toLocaleString('default', { month: 'short', year: 'numeric' });
        if (!monthMap[month]) {
          monthMap[month] = { month, total: 0, internal: 0, external: 0 };
        }
        monthMap[month].total += manDays;
        monthMap[month].internal += manDays;
      });

      // Add vendor man-days (1 vendor assignment = 1 man-day, excluding assets)
      vendorTeams?.forEach(t => {
        if (t.role === 'asset') return; // Do not count physical assets as man-days!
        
        const audit = t.audit as any;
        if (!audit || !audit.audit_date) return;
        
        // Check date range
        const auditDate = new Date(audit.audit_date);
        if (auditDate < dateRange.start || auditDate > dateRange.end) return;

        totalManDays += 1;
        externalManDays += 1;

        const projId = audit.project_id || 'unassigned_vendor';
        if (!projectMap[projId]) {
          projectMap[projId] = { project_id: projId, project_name: audit.project?.name || 'Vendor Audit', total: 0, internal: 0, external: 0 };
        }
        projectMap[projId].total += 1;
        projectMap[projId].external += 1;

        const month = auditDate.toLocaleString('default', { month: 'short', year: 'numeric' });
        if (!monthMap[month]) {
          monthMap[month] = { month, total: 0, internal: 0, external: 0 };
        }
        monthMap[month].total += 1;
        monthMap[month].external += 1;
      });

      return {
        totalManDays,
        internalManDays,
        externalManDays,
        byProject: Object.values(projectMap),
        byMonth: Object.values(monthMap)
      };
    }
  });
}
