import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Vendor } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Loader2, Trash2 } from 'lucide-react';

export function VendorManager() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({ name: '', contact_email: '', type: 'agency', default_human_rate: 0, default_asset_rate: 0 });

  const { data: vendors, isLoading } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const { data, error } = await supabase.from('vendors').select('*').order('name');
      if (error) throw error;
      return data;
    }
  });

  const createVendor = useMutation({
    mutationFn: async (vendor: any) => {
      const { error } = await supabase.from('vendors').insert([vendor]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast.success('Vendor added');
      setFormData({ name: '', contact_email: '', type: 'agency', default_human_rate: 0, default_asset_rate: 0 });
    },
    onError: (err: any) => toast.error(err.message)
  });

  const deleteVendor = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('vendors').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast.success('Vendor deleted');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    createVendor.mutate(formData);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle>Add Vendor</CardTitle>
          <CardDescription>Register a new agency or individual.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email (Optional)</label>
              <Input type="email" value={formData.contact_email} onChange={e => setFormData({ ...formData, contact_email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value as 'agency' | 'individual' })}
              >
                <option value="agency">Agency</option>
                <option value="individual">Individual</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Default Human Rate (₹)</label>
              <Input type="number" value={formData.default_human_rate} onChange={e => setFormData({ ...formData, default_human_rate: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Default Asset Rate (₹)</label>
              <Input type="number" value={formData.default_asset_rate} onChange={e => setFormData({ ...formData, default_asset_rate: Number(e.target.value) })} />
            </div>
            <Button type="submit" className="w-full" disabled={createVendor.isPending}>
              {createVendor.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Vendor
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Vendor Directory</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Human Rate</TableHead>
                  <TableHead className="text-right">Asset Rate</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors?.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.name}<br/><span className="text-xs text-muted-foreground">{v.contact_email}</span></TableCell>
                    <TableCell className="capitalize">{v.type}</TableCell>
                    <TableCell className="text-right">₹{v.default_human_rate}</TableCell>
                    <TableCell className="text-right">₹{v.default_asset_rate}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => { if(confirm('Delete vendor?')) deleteVendor.mutate(v.id) }}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(!vendors || vendors.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No vendors found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
