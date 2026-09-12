import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useAuditLogs(filters: any) {
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const query = useQuery({
    queryKey: ['auditLogs', filters, page],
    queryFn: async () => {
      let q = supabase.from('audit_logs').select('*, profiles(email, full_name)', { count: 'exact' });
      
      if (filters.action) q = q.eq('action', filters.action);
      if (filters.table_name) q = q.eq('table_name', filters.table_name);
      
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      
      const { data, count, error } = await q.order('created_at', { ascending: false }).range(from, to);
      if (error) throw error;
      
      // Client side filtering for actorSearch due to nested relation filtering limitations in basic supbabase querying sometimes
      let result = data;
      if (filters.actorSearch) {
         result = data.filter((d: any) => d.profiles?.email?.toLowerCase().includes(filters.actorSearch.toLowerCase()));
      }
      
      return { data: result, count };
    }
  });

  return {
    data: query.data?.data || [],
    totalCount: query.data?.count || 0,
    isLoading: query.isLoading,
    page,
    setPage
  };
}
