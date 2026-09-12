import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Audit, AuditTeam } from '@/lib/types';
import { toast } from 'sonner';

export function useAudits() {
  return useQuery({
    queryKey: ['audits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audits')
        .select(`
          *,
          client:clients(name)
        `)
        .order('audit_date', { ascending: true });
      if (error) throw error;
      return data;
    }
  });
}

export function useAuditTeams(auditId?: string) {
  return useQuery({
    queryKey: ['audit_teams', auditId],
    queryFn: async () => {
      if (!auditId) return [];
      const { data, error } = await supabase
        .from('audit_teams')
        .select(`
          *,
          user:profiles(full_name, email),
          vendor:vendors(name, type)
        `)
        .eq('audit_id', auditId);
      if (error) throw error;
      return data;
    },
    enabled: !!auditId
  });
}

export function useAssignTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (assignment: Omit<AuditTeam, 'id' | 'created_at'> & { audit_date?: string, project_id?: string }) => {
      const { audit_date, project_id, ...teamData } = assignment;
      
      const { data, error } = await supabase
        .from('audit_teams')
        .insert([teamData])
        .select()
        .single();
      if (error) throw error;

      // If it's an internal employee, create a calendar allocation
      if (teamData.user_id && audit_date && project_id) {
        const { error: allocError } = await supabase
          .from('allocations')
          .upsert({
            user_id: teamData.user_id,
            allocation_date: audit_date,
            audit_id: teamData.audit_id,
            project_id: project_id, // Link to the auto-generated project!
            hours: 0, // User updates themselves
            status: 'billable',
            notes: 'Auto-assigned from Audit Planner'
          }, { onConflict: 'user_id,allocation_date' });
        if (allocError) console.error('Failed to create allocation:', allocError);
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['audit_teams', data.audit_id] });
      queryClient.invalidateQueries({ queryKey: ['allocations'] });
      toast.success('Team member assigned');
    },
    onError: (error: any) => toast.error(error.message)
  });
}

export function useRemoveTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, auditId }: { id: string, auditId: string }) => {
      const { error } = await supabase
        .from('audit_teams')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { id, auditId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['audit_teams', data.auditId] });
      toast.success('Team member removed');
    },
    onError: (error: any) => toast.error(error.message)
  });
}

export function useUpdateAuditStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      const { data, error } = await supabase.from('audits').update({ status }).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audits'] });
      toast.success('Audit status updated');
    },
    onError: (error: any) => toast.error(error.message)
  });
}

export function useDeleteAudit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (audit: any) => {
      // Delete the audit
      const { error } = await supabase.from('audits').delete().eq('id', audit.id);
      if (error) throw error;
      
      // Delete the corresponding project if it exists
      if (audit.project_id) {
        await supabase.from('projects').delete().eq('id', audit.project_id);
      }
      return audit.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audits'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Audit deleted');
    },
    onError: (error: any) => toast.error(error.message)
  });
}
