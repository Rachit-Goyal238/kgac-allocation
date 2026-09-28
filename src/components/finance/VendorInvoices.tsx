import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, FileText, CheckCircle2, Clock, Download } from 'lucide-react';
import { exportToCSV, exportToExcel } from '@/lib/export';
import { printInvoice } from '@/lib/invoice';
import { Printer } from 'lucide-react';
import { toast } from 'sonner';

export function VendorInvoices() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState('');
  const [selectedAudit, setSelectedAudit] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('pending');

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          vendor:vendors(name),
          audit:audits(store_name, audit_date, project:projects(name))
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const { data: vendors } = useQuery({
    queryKey: ['vendors_list'],
    queryFn: async () => {
      const { data } = await supabase.from('vendors').select('id, name').order('name');
      return data || [];
    }
  });

  const { data: audits } = useQuery({
    queryKey: ['completed_audits'],
    queryFn: async () => {
      const { data } = await supabase.from('audits').select('id, store_name, audit_date').eq('status', 'completed').order('audit_date', { ascending: false });
      return data || [];
    }
  });

  const createInvoice = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('invoices').insert({
        vendor_id: selectedVendor,
        audit_id: selectedAudit,
        amount: Number(amount),
        status,
        notes
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setIsModalOpen(false);
      setSelectedVendor('');
      setSelectedAudit('');
      setAmount('');
      setNotes('');
      setStatus('pending');
      toast.success('Invoice created successfully');
    },
    onError: (err: any) => toast.error(err.message)
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string, newStatus: string }) => {
      const { error } = await supabase.from('invoices').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice status updated');
    }
  });

  if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-slate-400" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Vendor Invoices</h2>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <Button variant="outline" className="mr-2" onClick={() => exportToExcel(invoices?.map(i => ({ Date: new Date(i.created_at).toLocaleDateString(), Vendor: i.vendor?.name, Audit: i.audit?.store_name, Amount: i.amount, Status: i.status, Notes: i.notes })) || [], [], 'vendor_invoices.xlsx')}><Download className="h-4 w-4 mr-2"/> Export Excel</Button>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Create Invoice</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Vendor Invoice</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Vendor</label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={selectedVendor} onChange={e => setSelectedVendor(e.target.value)}>
                  <option value="">-- Select Vendor --</option>
                  {vendors?.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Audit</label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={selectedAudit} onChange={e => setSelectedAudit(e.target.value)}>
                  <option value="">-- Select Audit --</option>
                  {audits?.map(a => <option key={a.id} value={a.id}>{a.store_name} ({a.audit_date})</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount (INR)</label>
                <Input type="number" placeholder="Enter amount..." value={amount} onChange={e => setAmount(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={status} onChange={e => setStatus(e.target.value)}>
                  <option value="pending">Pending Payment</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Notes (Optional)</label>
                <Input placeholder="Invoice #, references..." value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button onClick={() => createInvoice.mutate()} disabled={!selectedVendor || !selectedAudit || !amount || createInvoice.isPending}>
                {createInvoice.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Invoice
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Audit / Project</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">No invoices found.</TableCell>
                </TableRow>
              )}
              {invoices?.map(inv => (
                <TableRow key={inv.id}>
                  <TableCell>{new Date(inv.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="font-medium text-slate-900">{inv.vendor?.name}</TableCell>
                  <TableCell>{inv.audit?.store_name}</TableCell>
                  <TableCell className="text-slate-500 text-sm max-w-[200px] truncate">{inv.notes || '-'}</TableCell>
                  <TableCell className="text-right font-medium">&#x20B9;{inv.amount.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    {inv.status === 'paid' ? (
                      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200"><CheckCircle2 className="w-3 h-3 mr-1" /> Paid</Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    {inv.status === 'pending' && (
                      <Button size="sm" variant="outline" className="text-xs" onClick={() => updateStatus.mutate({ id: inv.id, newStatus: 'paid' })}>
                        Mark Paid
                      </Button>
                    )}
                    {inv.status === 'paid' && (
                      <Button size="sm" variant="secondary" className="text-xs" onClick={() => printInvoice(inv)}>
                        <Printer className="h-3 w-3 mr-1" /> Print PDF
                      </Button>
                    )}
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
