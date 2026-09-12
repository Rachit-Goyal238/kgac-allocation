import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';

export function useRealtimeAllocations() {
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase.channel('realtime-allocations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'allocations' }, (payload) => {
        // Invalidate and refetch for simplicity and exactness
        queryClient.invalidateQueries({ queryKey: ['allocations'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
        queryClient.invalidateQueries({ queryKey: ['allocations'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'holidays' }, (payload) => {
        queryClient.invalidateQueries({ queryKey: ['holidays'] });
      })
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return { isConnected };
}
