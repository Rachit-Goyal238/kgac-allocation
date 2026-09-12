import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthContext } from '@/contexts/AuthContext';

export function RoleAlignmentConsole() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*');
      return data || [];
    }
  });

  const superAdminCount = profiles.filter((p: any) => p.role === 'super_admin').length;

  const updateRole = useMutation({
    mutationFn: async ({ id, role }: { id: string, role: string }) => {
      const { error } = await supabase.from('profiles').update({ role }).eq('id', id);
      if (error) throw error;
      await supabase.from('audit_logs').insert({ actor_id: user?.id, action: 'ROLE_CHANGE', table_name: 'profiles', record_id: id, changes: { role } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      toast.success('Role updated successfully');
    },
    onError: () => toast.error('Failed to update role')
  });

  if (isLoading) return <div>Loading...</div>;

  const pendingUsers = profiles.filter((p: any) => p.status === 'pending');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Role Alignment Console</h1>
        <div className="text-lg font-semibold bg-blue-100 text-blue-800 px-4 py-2 rounded-full">
          Super Admins: {superAdminCount}/3
        </div>
      </div>

      {pendingUsers.length > 0 && (
        <Card className="border-yellow-400">
          <CardHeader><CardTitle>Pending Approvals</CardTitle></CardHeader>
          <CardContent>
             <ul className="list-disc pl-5">
               {pendingUsers.map((u: any) => <li key={u.id}>{u.email} ({u.name})</li>)}
             </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Users</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Current Role</TableHead>
                <TableHead>Resource Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell>{p.name}</TableCell>
                  <TableCell>{p.email}</TableCell>
                  <TableCell>{p.role}</TableCell>
                  <TableCell>{p.resource_type}</TableCell>
                  <TableCell>{p.status}</TableCell>
                  <TableCell>
                    <Select value={p.role} onValueChange={(val) => updateRole.mutate({ id: p.id, role: val })}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="external">External</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="finance">Finance</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="super_admin" disabled={superAdminCount >= 3 && p.role !== 'super_admin'} title={superAdminCount >= 3 ? "Maximum 3 Super Admins reached" : ""}>Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
