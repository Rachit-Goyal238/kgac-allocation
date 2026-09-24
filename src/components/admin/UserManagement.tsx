import { useState } from 'react';
import { useProfiles, useUpdateProfile, useDepartments } from '@/hooks/useProfiles';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, Loader2, Edit, ChevronDown } from 'lucide-react';
import { PendingApprovals } from '@/components/admin/PendingApprovals';
import { CSVUploader } from '@/components/admin/CSVUploader';
import { ROLE_LABELS } from '@/lib/constants';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu';
import { Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

export function UserManagement() {
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  
  const { data: profiles, isLoading: profilesLoading } = useProfiles();
  const { data: departments = [], isLoading: deptsLoading } = useDepartments();
  const updateProfile = useUpdateProfile();
  const queryClient = useQueryClient();

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc('delete_user_by_admin', { target_user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('User permanently deleted');
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
    onError: (error) => {
      console.error(error);
      toast.error('Failed to delete user');
    }
  });

  // Removed legacy profile edit dialog since all users are internal and vendors are managed in Planner
  
  if (profilesLoading || deptsLoading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  const pendingProfiles = profiles?.filter(p => p.status === 'pending') || [];
  const activeProfiles = profiles?.filter(p => p.status !== 'pending' && 
    (deptFilter === 'all' || p.department_id === deptFilter) &&
    (roleFilter === 'all' || (p.roles && p.roles.includes(roleFilter as any))) &&
    (search === '' || (p.full_name || '').toLowerCase().includes(search.toLowerCase()) || (p.email || '').toLowerCase().includes(search.toLowerCase()))
  ) || [];

  const handleStatusChange = (id: string, newStatus: string) => {
    updateProfile.mutate({ id, status: newStatus as any });
  };

  const handleRoleToggle = (id: string, currentRoles: string[] | undefined, role: string) => {
    let newRoles = [...(currentRoles || [])];
    
    if (role === 'pending' && !newRoles.includes('pending')) {
      updateProfile.mutate({ id, roles: ['pending'], status: 'pending' });
      return;
    }
    
    if (newRoles.includes(role)) {
      newRoles = newRoles.filter(r => r !== role);
      if (newRoles.length === 0) newRoles = ['employee'];
    } else {
      newRoles.push(role);
      newRoles = newRoles.filter(r => r !== 'pending');
    }
    
    updateProfile.mutate({ id, roles: newRoles as any });
  };

  const handleDeptChange = (id: string, newDept: string) => {
    updateProfile.mutate({ id, department_id: newDept === '' ? null : newDept });
  };

  const handleApprove = (id: string, role: any, deptId: string | null) => {
    updateProfile.mutate({ id, status: 'active', roles: [role], department_id: deptId, entity_selected: true });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search users..."
              className="pl-8 w-full sm:w-[250px]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="Department" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Depts</SelectItem>
              {departments.map(d => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="Role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="planner">Planner</SelectItem>
              <SelectItem value="client_head">Client Head</SelectItem>
              <SelectItem value="audit_executive">Audit Executive</SelectItem>
              <SelectItem value="employee">Employee</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <CSVUploader />
      </div>

      <PendingApprovals profiles={pendingProfiles} onApprove={handleApprove} onReject={(id) => handleStatusChange(id, 'inactive')} />

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Zone</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activeProfiles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No users found matching filters.</TableCell>
              </TableRow>
            ) : (
              activeProfiles.map(profile => (
                <TableRow key={profile.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                          {(profile.full_name || profile.email || 'U').substring(0, 2).toUpperCase()}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium">{profile.full_name}</div>
                        <div className="text-xs text-muted-foreground">{profile.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="w-[120px] h-8 text-xs justify-between">
                          <span className="truncate">
                            {profile.roles && profile.roles.length > 1 
                              ? `${profile.roles.length} roles` 
                              : (profile.roles && profile.roles.length > 0 
                                  ? ROLE_LABELS[profile.roles[0] as keyof typeof ROLE_LABELS] || profile.roles[0]
                                  : 'Select role')}
                          </span>
                          <ChevronDown className="h-4 w-4 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-[180px]">
                        {Object.entries(ROLE_LABELS).map(([value, label]) => (
                          <DropdownMenuCheckboxItem
                            key={value}
                            checked={profile.roles?.includes(value as any)}
                            onCheckedChange={() => handleRoleToggle(profile.id, profile.roles, value)}
                          >
                            {label}
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                  <TableCell>
                    <Select value={profile.entity || 'none'} onValueChange={(v) => updateProfile.mutate({ id: profile.id, entity: (v === 'none' ? null : v) as any, entity_selected: v !== 'none' })}>
                      <SelectTrigger className="w-[90px] h-8 text-xs"><SelectValue placeholder="Entity" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="KGAC">KGAC</SelectItem>
                        <SelectItem value="KPL">KPL</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select value={profile.department_id && departments.some(d => d.id === profile.department_id) ? profile.department_id : 'none'} onValueChange={(v) => handleDeptChange(profile.id, v === 'none' ? '' : v)}>
                      <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="Assign dept" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {departments.map(d => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <input 
                      type="text" 
                      className="border rounded p-1 text-xs w-[80px]" 
                      placeholder="Zone..." 
                      defaultValue={profile.zone || ''}
                      onBlur={e => {
                        if (e.target.value !== (profile.zone || '')) {
                          updateProfile.mutate({ id: profile.id, zone: e.target.value });
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        checked={!!profile.is_internal_vendor} 
                        onChange={(e) => updateProfile.mutate({ id: profile.id, is_internal_vendor: e.target.checked })} 
                      />
                      <span className="text-xs">Yes</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={profile.status === 'active' ? 'default' : 'secondary'} className={profile.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20' : ''}>
                      {profile.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className={profile.status === 'active' ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50' : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'}
                        onClick={() => handleStatusChange(profile.id, profile.status === 'active' ? 'inactive' : 'active')}
                      >
                        {profile.status === 'active' ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 px-2"
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to completely erase ${profile.full_name || profile.email} from the database? This cannot be undone.`)) {
                            deleteUser.mutate(profile.id);
                          }
                        }}
                        disabled={deleteUser.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      

    </div>
  );
}
