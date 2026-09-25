import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Department } from '@/lib/types';
import { useDepartments, useProfiles } from '@/hooks/useProfiles';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Pencil, Trash2, Plus, Loader2 } from 'lucide-react';

export function DepartmentManager() {
  const queryClient = useQueryClient();
  const { data: departments = [], isLoading: deptsLoading } = useDepartments();
  const { data: profiles = [], isLoading: profilesLoading } = useProfiles();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [formData, setFormData] = useState({ name: '', manager_id: 'none' });

  const addMutation = useMutation({
    mutationFn: async (data: { name: string; manager_id: string | null }) => {
      const { error } = await supabase.from('departments').insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success('Department created');
      closeDialog();
    },
    onError: (error: any) => toast.error(`Failed to create: ${error.message}`),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; name: string; manager_id: string | null }) => {
      const { error } = await supabase.from('departments').update({ name: data.name, manager_id: data.manager_id }).eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success('Department updated');
      closeDialog();
    },
    onError: (error: any) => toast.error(`Failed to update: ${error.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('departments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success('Department deleted');
    },
    onError: (error: any) => toast.error(`Failed to delete: ${error.message}`),
  });

  const openDialog = (dept?: Department) => {
    if (dept) {
      setEditingDept(dept);
      setFormData({ name: dept.name, manager_id: dept.manager_id || 'none' });
    } else {
      setEditingDept(null);
      setFormData({ name: '', manager_id: 'none' });
    }
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingDept(null);
    setFormData({ name: '', manager_id: 'none' });
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error('Department name is required');
      return;
    }
    const payload = {
      name: formData.name,
      manager_id: formData.manager_id === 'none' ? null : formData.manager_id,
    };
    if (editingDept) {
      updateMutation.mutate({ id: editingDept.id, ...payload });
    } else {
      addMutation.mutate(payload);
    }
  };

  if (deptsLoading || profilesLoading) {
    return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Departments</h3>
          <p className="text-sm text-muted-foreground">Manage organization departments and their managers.</p>
        </div>
        <Button onClick={() => openDialog()}>
          <Plus className="mr-2 h-4 w-4" /> Add Department
        </Button>
      </div>

      <div className="rounded-md border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Manager</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {departments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No departments found.</TableCell>
              </TableRow>
            ) : (
              departments.map(dept => {
                const manager = profiles.find(p => p.id === dept.manager_id);
                return (
                  <TableRow key={dept.id}>
                    <TableCell className="font-medium">{dept.name}</TableCell>
                    <TableCell>{manager ? manager.full_name : <span className="text-muted-foreground italic">Unassigned</span>}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => openDialog(dept)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete ${dept.name}?`)) {
                            deleteMutation.mutate(dept.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDept ? 'Edit Department' : 'Add Department'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input 
                placeholder="E.g., Engineering" 
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Manager</label>
              <Select 
                value={formData.manager_id} 
                onValueChange={(val) => setFormData({ ...formData, manager_id: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select manager" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {profiles.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button 
              onClick={handleSubmit} 
              disabled={addMutation.isPending || updateMutation.isPending}
            >
              {editingDept ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

