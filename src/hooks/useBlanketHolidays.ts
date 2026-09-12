import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { BlanketHoliday } from '@/lib/types';
import { toast } from 'sonner';

export function useBlanketHolidays() {
  return useQuery({
    queryKey: ['blanket_holidays'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blanket_holidays')
        .select('*')
        .order('date', { ascending: true });

      if (error) {
        console.error('Error fetching blanket holidays:', error);
        throw error;
      }
      return data as BlanketHoliday[];
    },
  });
}

export function isBlanketHoliday(holidays: BlanketHoliday[] | undefined, dateStr: string): BlanketHoliday | undefined {
  if (!holidays) return undefined;
  return holidays.find(h => h.date === dateStr);
}

export function useCreateBlanketHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (holiday: Omit<BlanketHoliday, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('blanket_holidays')
        .insert([holiday])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blanket_holidays'] });
      toast.success('Holiday created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create holiday');
    },
  });
}

export function useDeleteBlanketHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('blanket_holidays')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blanket_holidays'] });
      toast.success('Holiday deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete holiday');
    },
  });
}
