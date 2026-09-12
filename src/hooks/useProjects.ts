import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Project } from '@/lib/types';

export function useProjects() {
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data as Project[];
    },
  });

  return { projects, isLoading };
}
