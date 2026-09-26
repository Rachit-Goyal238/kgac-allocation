import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Vendor, VendorRate } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { VendorResourceImporter } from './VendorResourceImporter';
import { Loader2, Plus, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';

export function VendorManager() {
  const queryClient = useQueryClient();
  const { data: vendors, isLoading } = useQuery({
    queryKey: ['vendors_admin'],
    queryFn: async () => {
      const { data } = await supabase.from('vendors').select('*');
      return data as Vendor[];
    }
  });

  const { data: vendorRates } = useQuery({
    queryKey: ['vendor_rates'],
    queryFn: async () => {
      const { data } = await supabase.from('vendor_rates').select('*');
      return data as VendorRate[];
    }
  });

  const [newVendor, setNewVendor] = useState({ name: '', type: 'agency', default_human_rate: '', default_asset_rate: '' });
  
  const createVendor = useMutation({
    mutationFn: async (v: any) => {
      const { error } = await supabase.from('vendors').insert([{
        ...v,
        default_human_rate: v.default_human_rate ? Number(v.default_human_rate) : null,
        default_asset_rate: v.default_asset_rate ? Number(v.default_asset_rate) : null
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors_admin'] });
      setNewVendor({ name: '', type: 'agency', default_human_rate: '', default_asset_rate: '' });
      toast.success('Vendor created');
    }
  });

  if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">External Vendors</h3>
          <VendorResourceImporter />
      </div>

      <div className="bg-slate-50 p-4 rounded-lg border grid grid-cols-5 gap-4 items-end">
        <div>
          <label className="text-xs font-medium">Vendor Name</label>
          <input className="w-full border rounded p-2 text-sm" value={newVendor.name} onChange={e => setNewVendor({...newVendor, name: e.target.value})} />
        </div>
        <div>
          <label className="text-xs font-medium">Type</label>
          <select className="w-full border rounded p-2 text-sm" value={newVendor.type} onChange={e => setNewVendor({...newVendor, type: e.target.value})}>
            <option value="agency">Agency</option>
            <option value="individual">Individual</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium">Default Human Rate</label>
          <input type="number" className="w-full border rounded p-2 text-sm" value={newVendor.default_human_rate} onChange={e => setNewVendor({...newVendor, default_human_rate: e.target.value})} />
        </div>
        <div>
          <label className="text-xs font-medium">Default Asset Rate</label>
          <input type="number" className="w-full border rounded p-2 text-sm" value={newVendor.default_asset_rate} onChange={e => setNewVendor({...newVendor, default_asset_rate: e.target.value})} />
        </div>
        <Button onClick={() => createVendor.mutate(newVendor)} disabled={!newVendor.name || createVendor.isPending}>
          {createVendor.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          Add
        </Button>
      </div>

      <div className="space-y-4">
        {vendors?.map(vendor => (
          <VendorRow 
            key={vendor.id} 
            vendor={vendor} 
            rates={vendorRates?.filter(r => r.vendor_id === vendor.id) || []} 
            queryClient={queryClient} 
          />
        ))}
      </div>
    </div>
  );
}

function VendorRow({ vendor, rates, queryClient }: { vendor: any, rates: any[], queryClient: any }) {
  const [expanded, setExpanded] = useState(false);
  const [newZone, setNewZone] = useState({ zone_or_reason: '', human_rate: '', asset_rate: '' });

  const { data: resources = [] } = useQuery({
    queryKey: ['vendor_resources', vendor.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('vendor_resources').select('*').eq('vendor_id', vendor.id).order('name');
      if (error) throw error;
      return data;
    },
    enabled: expanded
  });

  const deleteVendor = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('vendors').delete().eq('id', vendor.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors_admin'] });
      toast.success('Vendor deleted');
    }
  });
  
  const addRate = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('vendor_rates').insert([{
        vendor_id: vendor.id,
        zone_or_reason: newZone.zone_or_reason,
        human_rate: newZone.human_rate ? Number(newZone.human_rate) : null,
        asset_rate: newZone.asset_rate ? Number(newZone.asset_rate) : null
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor_rates'] });
      setNewZone({ zone_or_reason: '', human_rate: '', asset_rate: '' });
      toast.success('Rate added');
    }
  });
  
  const deleteRate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('vendor_rates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor_rates'] });
    }
  });

  return (
    <div className="border rounded-lg overflow-hidden">
      <div 
        className="p-4 bg-white flex justify-between items-center cursor-pointer hover:bg-slate-50"
        onClick={() => setExpanded(!expanded)}
      >
        <div>
          <div className="font-medium">{vendor.name}</div>
          <div className="text-xs text-muted-foreground capitalize">{vendor.type} â€¢ Default: {vendor.default_human_rate || '-'}</div>
        </div>
        <Button variant="outline" size="sm">
          {expanded ? 'Hide Rates' : 'Variable Rates'}
        </Button>
      </div>
      
      {expanded && (
        <div className="p-4 bg-slate-50 border-t space-y-3">
          <h4 className="text-sm font-semibold">Zone / Reason Rates</h4>
          
          {rates.length > 0 ? (
            <div className="space-y-2">
              {rates.map(r => (
                <div key={r.id} className="flex items-center justify-between bg-white border p-2 rounded text-sm">
                  <span className="font-medium w-1/3">{r.zone_or_reason}</span>
                  <span className="text-muted-foreground">Human: {r.human_rate || '-'}</span>
                  <span className="text-muted-foreground">Asset: {r.asset_rate || '-'}</span>
                  <Button variant="ghost" size="icon" onClick={() => deleteRate.mutate(r.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No variable rates configured.</div>
          )}

          <div className="flex gap-2 items-center mt-4">
            <input className="border rounded p-1.5 text-sm flex-1" placeholder="Zone or Reason (e.g. North Zone)" value={newZone.zone_or_reason} onChange={e => setNewZone({...newZone, zone_or_reason: e.target.value})} />
            <input type="number" className="border rounded p-1.5 text-sm w-24" placeholder="Human Rate" value={newZone.human_rate} onChange={e => setNewZone({...newZone, human_rate: e.target.value})} />
            <input type="number" className="border rounded p-1.5 text-sm w-24" placeholder="Asset Rate" value={newZone.asset_rate} onChange={e => setNewZone({...newZone, asset_rate: e.target.value})} />
            <Button size="sm" onClick={() => addRate.mutate()} disabled={!newZone.zone_or_reason || addRate.isPending}>Add</Button>
          </div>
        </div>
      )}
    </div>
  );
}







