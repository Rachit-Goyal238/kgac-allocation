import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

export function useBillingMetrics(dateRange: { start: Date, end: Date }) {
  return useQuery({
    queryKey: ['billingMetrics', dateRange],
    queryFn: async () => {
      // Fetch audits in date range (only care about completed or all?)
      // Let's fetch all audits in the date range and their teams
      const { data: audits } = await supabase
        .from('audits')
        .select(`
          *,
          client:clients(name),
          teams:audit_teams(
            id, role, agreed_rate, user_id, vendor_id,
            vendor:vendors(name, default_human_rate, default_asset_rate),
            user:profiles(full_name, is_internal_vendor)
          )
        `)
        .gte('audit_date', format(dateRange.start, 'yyyy-MM-dd'))
        .lte('audit_date', format(dateRange.end, 'yyyy-MM-dd'));

      let totalOwed = 0;
      let idleCostLeakage = 0;
      const vendorOwedMap: Record<string, number> = {};
      const auditOwedMap: Record<string, any> = {};
      const externalResources: any[] = [];

      audits?.forEach((audit: any) => {
        let auditTotal = 0;
        
        audit.teams?.forEach((team: any) => {
          let rate = 0;
          let resourceName = '';
          
          if (team.vendor_id && team.vendor) {
            // Vendor resource
            rate = team.agreed_rate;
            if (!rate) {
              rate = team.role === 'asset' 
                ? team.vendor.default_asset_rate 
                : team.vendor.default_human_rate;
            }
            rate = Number(rate) || 0;
            resourceName = team.vendor.name;
          } else if (team.user_id && team.agreed_rate) {
            // Internal resource with cost
            rate = Number(team.agreed_rate) || 0;
            resourceName = team.user?.is_internal_vendor ? team.user.full_name : 'Internal Employee';
          }
          
          if (rate > 0) {
            totalOwed += rate;
            auditTotal += rate;
            
            vendorOwedMap[resourceName] = (vendorOwedMap[resourceName] || 0) + rate;
            
            externalResources.push({
              audit_name: audit.store_name,
              audit_date: audit.audit_date,
              vendor: resourceName,
              resource_name: team.vendor ? team.vendor.name : (team.user?.full_name || 'Internal'),
              role: team.role,
              amount: rate
            });
          }
        });

        auditOwedMap[audit.id] = {
          audit_name: audit.store_name,
          client_name: audit.client?.name || 'Unknown',
          amount: auditTotal
        };
      });

      const owedByVendor = Object.entries(vendorOwedMap).map(([vendor, amount]) => ({ vendor, amount })).sort((a,b) => b.amount - a.amount);
      const owedByAudit = Object.values(auditOwedMap).sort((a: any, b: any) => b.amount - a.amount);

      return { totalOwed, owedByVendor, owedByAudit, idleCostLeakage, externalResources };
    }
  });
}
