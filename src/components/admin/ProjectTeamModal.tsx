import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Profile, Project } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';

interface ProjectTeamModalProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ProjectTeamModal({ project, isOpen, onClose }: ProjectTeamModalProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  // Fetch all active profiles
  const { data: profiles, isLoading: profilesLoading } = useQuery({
    queryKey: ['profiles', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('status', 'active').order('full_name');
      if (error) throw error;
      return data as Profile[];
    },
    enabled: isOpen
  });

  // Fetch assignments for this project
  const { data: assignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ['project_assignments_by_project', project?.id],
    queryFn: async () => {
      if (!project) return [];
      const { data, error } = await supabase.from('project_assignments').select('user_id').eq('project_id', project.id);
      if (error) throw error;
      return data.map(d => d.user_id);
    },
    enabled: isOpen && !!project
  });

  const assignUser = useMutation({
    mutationFn: async ({ userId, assign }: { userId: string, assign: boolean }) => {
      if (!project) return;
      if (assign) {
        const { error } = await supabase.from('project_assignments').insert({ project_id: project.id, user_id: userId });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('project_assignments').delete().eq('project_id', project.id).eq('user_id', userId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project_assignments_by_project', project?.id] });
    },
    onError: (error: any) => toast.error(error.message)
  });

  const isLoading = profilesLoading || assignmentsLoading;
  
  const filteredProfiles = profiles?.filter(p => p.full_name?.toLowerCase().includes(search.toLowerCase()) || p.email?.toLowerCase().includes(search.toLowerCase())) || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Assign Team to: {project?.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center space-x-2 border rounded-md px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input 
              className="flex-1 outline-none text-sm bg-transparent" 
              placeholder="Search users..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="border rounded-md max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-6 w-6 text-slate-400" /></div>
            ) : filteredProfiles.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No users found.</div>
            ) : (
              <div className="divide-y">
                {filteredProfiles.map(p => {
                  const isAssigned = assignments?.includes(p.id) || false;
                  return (
                    <div key={p.id} className="flex justify-between items-center p-3 hover:bg-slate-50">
                      <div>
                        <div className="font-medium text-sm">{p.full_name}</div>
                        <div className="text-xs text-slate-500">{p.email}</div>
                      </div>
                      <Switch 
                        checked={isAssigned} 
                        onCheckedChange={(checked) => assignUser.mutate({ userId: p.id, assign: checked })}
                        disabled={assignUser.isPending}
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
        
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
