import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Vendor, VendorRate } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, Trash2 } from 'lucide-react';
import { VendorResourceImporter } from './VendorResourceImporter';

export function VendorManager() {
  const queryClient = useQueryClient();
  const [newVendor, setNewVendor] = useState({ name: '', contact_email: '', type: 'agency', default_human_rate: '', default_asset_rate: '' });

  const { data: vendors, isLoading } = useQuery({
    queryKey: ['vendors_admin'],
    queryFn: async () => {
      const { data, error } = await supabase.from('vendors').select('*').order('name');
      if (error) throw error;
      return data as Vendor[];
    }
  });

  const { data: vendorRates } = useQuery({
    queryKey: ['vendor_rates'],
    queryFn: async () => {
      const { data, error } = await supabase.from('vendor_rates').select('*');
      if (error) throw error;
      return data as VendorRate[];
    }
  });

  const createVendor = useMutation({
    mutationFn: async (v: any) => {
      const { error } = await supabase.from('vendors').insert([{
        name: v.name, contact_email: v.contact_email, type: v.type,
        default_human_rate: v.default_human_rate ? Number(v.default_human_rate) : null,
        default_asset_rate: v.default_asset_rate ? Number(v.default_asset_rate) : null
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors_admin'] });
      setNewVendor({ name: '', contact_email: '', type: 'agency', default_human_rate: '', default_asset_rate: '' });
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

      <div className="bg-slate-50 p-4 rounded-lg border grid grid-cols-6 gap-4 items-end">
        <div>
          <label className="text-xs font-medium">Vendor Name</label>
          <input className="w-full border rounded p-2 text-sm" value={newVendor.name} onChange={e => setNewVendor({...newVendor, name: e.target.value})} />
        </div>
        <div>
          <label className="text-xs font-medium">Contact Email</label>
          <input className="w-full border rounded p-2 text-sm" value={newVendor.contact_email} onChange={e => setNewVendor({...newVendor, contact_email: e.target.value})} placeholder="Master Vendor Email" />
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
          {createVendor.isPending ? <Loader2 className="animate-spin h-4 w-4" /> : 'Add Vendor'}
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

  const deleteResource = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('vendor_resources').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor_resources', vendor.id] });
      toast.success('Resource deleted');
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
      <div className="p-4 bg-white flex justify-between items-center hover:bg-slate-50">
        <div className="cursor-pointer flex-1" onClick={() => setExpanded(!expanded)}>
          <div className="font-medium">{vendor.name}</div>
          <div className="text-xs text-muted-foreground capitalize">{vendor.type} | Default: {vendor.default_human_rate || '-'}</div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setExpanded(!expanded)}>
            {expanded ? 'Hide Details' : 'View Details'}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => { if(confirm('Are you sure you want to delete this vendor?')) deleteVendor.mutate(); }}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </div>
      
      {expanded && (
        <div className="p-4 bg-slate-50 border-t space-y-6">
          {/* RESOURCES SECTION */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Imported Resources</h4>
            {resources.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-auto border rounded bg-white">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 font-medium">Name</th>
                      <th className="px-3 py-2 font-medium">Type</th>
                      <th className="px-3 py-2 font-medium">Default Rate</th>
                      <th className="px-3 py-2 font-medium">Email</th>
                      <th className="px-3 py-2 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {resources.map((res: any) => (
                      <tr key={res.id} className="border-t hover:bg-slate-50">
                        <td className="px-3 py-2">{res.name}</td>
                        <td className="px-3 py-2 uppercase text-xs">{res.type}</td>
                        <td className="px-3 py-2">{res.default_rate || '-'}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{res.contact_email || "-"}</td>
                        <td className="px-3 py-2 text-right">
                          <Button variant="ghost" size="icon" onClick={() => { if(confirm("Delete resource?")) deleteResource.mutate(res.id); }}>
                            <Trash2 className="h-3 w-3 text-red-500" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No resources imported. Use the CSV Importer above.</div>
            )}
          </div>

          {/* RATES SECTION */}
          <div className="space-y-3 pt-4 border-t">
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
            <div className="flex gap-2 items-center mt-2">
              <input className="border rounded p-1.5 text-sm flex-1" placeholder="Zone or Reason (e.g. North Zone)" value={newZone.zone_or_reason} onChange={e => setNewZone({...newZone, zone_or_reason: e.target.value})} />
              <input type="number" className="border rounded p-1.5 text-sm w-24" placeholder="Human Rate" value={newZone.human_rate} onChange={e => setNewZone({...newZone, human_rate: e.target.value})} />
              <input type="number" className="border rounded p-1.5 text-sm w-24" placeholder="Asset Rate" value={newZone.asset_rate} onChange={e => setNewZone({...newZone, asset_rate: e.target.value})} />
              <Button size="sm" onClick={() => addRate.mutate()} disabled={!newZone.zone_or_reason || addRate.isPending}>Add</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

