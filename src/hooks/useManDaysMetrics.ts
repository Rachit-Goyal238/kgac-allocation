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
        .lte('allocation_date', format(dateRange.end, 'yyyy-MM-dd'))
        .eq('is_approved', true);
        
      if (zoneFilter) {
        query = query.ilike('profiles.zone', `%${zoneFilter}%`);
      }
      
      const { data: allocations, error: allocError } = await query;
      if (allocError) throw allocError;

      const { data: auditTeams, error: teamError } = await supabase
        .from('audit_teams')
        .select(`
          id, vendor_id, user_id, role,
          audit:audits(id, audit_date, end_date, project_id, project:projects(name))
        `);
      if (teamError) throw teamError;

      let totalManDays = 0;
      let internalManDays = 0;
      let externalManDays = 0;
      const projectMap: Record<string, any> = {};
      const monthMap: Record<string, any> = {};

      allocations?.forEach(a => {
        if (a.audit_id) return;

        const manDays = a.hours / WORK_HOURS_PER_DAY;
        
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

      auditTeams?.forEach(t => {
        if (t.role === 'asset') return;
        
        const audit = t.audit as any;
        if (!audit || !audit.audit_date) return;
        
        const auditDate = new Date(audit.audit_date);
        if (auditDate < dateRange.start || auditDate > dateRange.end) return;

        let days = 1;
        if (audit.end_date && audit.end_date !== audit.audit_date) {
            const diffTime = Math.abs(new Date(audit.end_date).getTime() - auditDate.getTime());
            days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        }

        totalManDays += days;
        if (t.vendor_id) {
          externalManDays += days;
        } else if (t.user_id) {
          internalManDays += days;
        }

        const projId = audit.project_id || 'unassigned_vendor';
        if (!projectMap[projId]) {
          projectMap[projId] = { project_id: projId, project_name: audit.project?.name || 'Audit Project', total: 0, internal: 0, external: 0 };
        }
        projectMap[projId].total += days;
        if (t.vendor_id) {
          projectMap[projId].external += days;
        } else if (t.user_id) {
          projectMap[projId].internal += days;
        }

        const month = auditDate.toLocaleString('default', { month: 'short', year: 'numeric' });
        if (!monthMap[month]) {
          monthMap[month] = { month, total: 0, internal: 0, external: 0 };
        }
        monthMap[month].total += days;
        if (t.vendor_id) {
          monthMap[month].external += days;
        } else if (t.user_id) {
          monthMap[month].internal += days;
        }
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
