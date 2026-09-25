import React, { useState } from 'react';
import { useClients, useCreateClient, useUpdateClient, useDeleteClient } from '@/hooks/useClients';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function ClientManager() {
  const { data: clients, isLoading } = useClients();
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();

  const [formData, setFormData] = useState({ name: '', code: '', contact_email: '' });
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateClient.mutate({ id: editingId, ...formData });
      setEditingId(null);
    } else {
      createClient.mutate(formData);
    }
    setFormData({ name: '', code: '', contact_email: '' });
  };

  const handleEdit = (client: any) => {
    setEditingId(client.id);
    setFormData({ name: client.name, code: client.code, contact_email: client.contact_email });
  };

  if (isLoading) return <div>Loading clients...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>{editingId ? 'Edit Client' : 'Add Client'}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex gap-4 items-end">
            <div>
               <label className="text-sm font-medium">Name</label>
               <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
            </div>
            <div>
               <label className="text-sm font-medium">Code</label>
               <Input value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} required />
            </div>
            <div>
               <label className="text-sm font-medium">Contact Email</label>
               <Input value={formData.contact_email} onChange={e => setFormData({...formData, contact_email: e.target.value})} />
            </div>
            <Button type="submit">{editingId ? 'Update' : 'Add'} Client</Button>
            {editingId && <Button type="button" variant="outline" onClick={() => { setEditingId(null); setFormData({name: '', code: '', contact_email: ''}); }}>Cancel</Button>}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Clients</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Contact Email</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients?.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{c.code}</TableCell>
                  <TableCell>{c.contact_email}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(c)}>Edit</Button>
                      <Button size="sm" variant="destructive" onClick={() => { if(confirm('Delete client?')) deleteClient.mutate(c.id); }}>Delete</Button>
                    </div>
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

