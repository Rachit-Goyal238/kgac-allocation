import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Project } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, Pencil, Loader2, Trash } from 'lucide-react';

export function ProjectManager() {
  const queryClient = useQueryClient();
  
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['admin_projects'],
    queryFn: async () => {
      const { data, error } = await supabase.from('projects').select('*').order('name');
      if (error) throw error;
      return data as Project[];
    }
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    color: '#3b82f6',
    is_billable: true,
    client_id: null as string | null,
  });

  const addMutation = useMutation({
    mutationFn: async (data: Omit<Project, 'id' | 'created_at' | 'is_active'>) => {
      // By default new projects are active
      const { error } = await supabase.from('projects').insert([{ ...data, is_active: true }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_projects'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project created');
      closeDialog();
    },
    onError: (error: any) => toast.error(`Failed to create: ${error.message}`),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string } & Partial<Project>) => {
      const { id, ...updates } = data;
      const { error } = await supabase.from('projects').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_projects'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project updated');
      closeDialog();
    },
    onError: (error: any) => toast.error(`Failed to update: ${error.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_projects'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project deleted successfully');
    },
    onError: (error: any) => toast.error(`Failed to delete: ${error.message}`),
  });

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this project? This will also delete all associated allocations.')) {
      deleteMutation.mutate(id);
    }
  };

  const openDialog = (project?: Project) => {
    if (project) {
      setEditingProject(project);
      setFormData({ 
        name: project.name, 
        code: project.code, 
        color: project.color, 
        is_billable: project.is_billable,
        client_id: project.client_id
      });
    } else {
      setEditingProject(null);
      setFormData({ name: '', code: '', color: '#3b82f6', is_billable: true, client_id: null });
    }
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingProject(null);
    setFormData({ name: '', code: '', color: '#3b82f6', is_billable: true, client_id: null });
  };

  const handleSubmit = () => {
    if (!formData.name.trim() || !formData.code.trim()) {
      toast.error('Project name and code are required');
      return;
    }
    if (editingProject) {
      updateMutation.mutate({ id: editingProject.id, ...formData });
    } else {
      addMutation.mutate(formData);
    }
  };

  const toggleActive = (project: Project) => {
    updateMutation.mutate({ id: project.id, is_active: !project.is_active });
  };

  if (isLoading) {
    return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Projects</h3>
          <p className="text-sm text-muted-foreground">Manage client and internal projects.</p>
        </div>
        <Button onClick={() => openDialog()}>
          <Plus className="mr-2 h-4 w-4" /> Add Project
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Color</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Billable</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No projects found.</TableCell>
              </TableRow>
            ) : (
              projects.map(project => (
                <TableRow key={project.id}>
                  <TableCell>
                    <div className="w-6 h-6 rounded-md shadow-sm" style={{ backgroundColor: project.color }} />
                  </TableCell>
                  <TableCell className="font-medium">{project.code}</TableCell>
                  <TableCell>{project.name}</TableCell>
                  <TableCell>
                    {project.is_billable ? (
                      <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md text-xs font-medium">Yes</span>
                    ) : (
                      <span className="text-slate-600 bg-slate-100 px-2 py-1 rounded-md text-xs font-medium">No</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Switch 
                        checked={project.is_active} 
                        onCheckedChange={() => toggleActive(project)} 
                      />
                      <span className="text-sm text-muted-foreground">
                        {project.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openDialog(project)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50 ml-1" onClick={() => handleDelete(project.id)}>
                      <Trash className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProject ? 'Edit Project' : 'Add Project'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Code</Label>
                <Input 
                  placeholder="E.g., PRJ-01" 
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex space-x-2">
                  <Input 
                    type="color"
                    className="w-12 p-1 h-9 cursor-pointer"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  />
                  <Input 
                    className="flex-1 uppercase font-mono"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input 
                placeholder="E.g., Website Redesign" 
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <Switch 
                id="is-billable"
                checked={formData.is_billable}
                onCheckedChange={(checked) => setFormData({ ...formData, is_billable: checked })}
              />
              <Label htmlFor="is-billable">This project is billable</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button 
              onClick={handleSubmit} 
              disabled={addMutation.isPending || updateMutation.isPending}
            >
              {editingProject ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
