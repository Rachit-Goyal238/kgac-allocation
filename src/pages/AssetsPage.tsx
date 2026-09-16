import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus, Monitor, Laptop } from 'lucide-react';
import { toast } from 'sonner';

export function AssetsPage() {
  const { profile } = useAuthContext();
  const isManagerOrAdmin = profile?.roles?.some(r => ['admin', 'super_admin', 'manager'].includes(r));
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="flex flex-col h-full bg-slate-50/30 p-6 overflow-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Internal Assets</h2>
        <p className="text-sm text-slate-500 mt-1">Track and request internal equipment.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="dashboard">Asset Dashboard</TabsTrigger>
          <TabsTrigger value="my-requests">My Requests</TabsTrigger>
          {isManagerOrAdmin && <TabsTrigger value="approvals">Approvals</TabsTrigger>}
          {isManagerOrAdmin && <TabsTrigger value="manage">Manage Assets</TabsTrigger>}
        </TabsList>

        <TabsContent value="dashboard">
          <AssetDashboard />
        </TabsContent>
        <TabsContent value="my-requests">
          <MyAssetRequests userId={profile?.id} />
        </TabsContent>
        {isManagerOrAdmin && (
          <TabsContent value="approvals">
            <AssetApprovals />
          </TabsContent>
        )}
        {isManagerOrAdmin && (
          <TabsContent value="manage">
            <ManageAssets />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function AssetDashboard() {
  const { data: assets, isLoading } = useQuery({
    queryKey: ['internal_assets'],
    queryFn: async () => {
      const { data } = await supabase.from('internal_assets').select(`
        *, holder:profiles(full_name)
      `);
      return data;
    }
  });

  if (isLoading) return <Loader2 className="animate-spin text-slate-400" />;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {assets?.map((asset: any) => (
        <div key={asset.id} className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              {asset.type === 'laptop' ? <Laptop className="h-5 w-5 text-slate-500" /> : <Monitor className="h-5 w-5 text-slate-500" />}
              <div className="font-medium">{asset.name}</div>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${asset.status === 'available' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
              {asset.status}
            </span>
          </div>
          <div className="mt-4 text-sm text-slate-600">
            <div>S/N: {asset.serial_number || 'N/A'}</div>
            <div className="mt-1">Current Holder: <span className="font-medium text-slate-900">{asset.holder?.full_name || 'None'}</span></div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MyAssetRequests({ userId }: { userId?: string }) {
  const queryClient = useQueryClient();
  const [assetId, setAssetId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: assets } = useQuery({ queryKey: ['internal_assets'], queryFn: async () => (await supabase.from('internal_assets').select('*').eq('status', 'available')).data });
  const { data: requests } = useQuery({ queryKey: ['asset_requests', userId], queryFn: async () => (await supabase.from('asset_requests').select('*, asset:internal_assets(name)').eq('user_id', userId)).data, enabled: !!userId });

  const requestAsset = useMutation({
    mutationFn: async () => {
      if (!userId || !assetId || !startDate) return;
      await supabase.from('asset_requests').insert([{ user_id: userId, asset_id: assetId, start_date: startDate, end_date: endDate || null, status: 'pending' }]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset_requests', userId] });
      toast.success('Request submitted');
      setAssetId(''); setStartDate(''); setEndDate('');
    }
  });

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-lg shadow-sm border space-y-4 max-w-md">
        <h3 className="font-medium">New Request</h3>
        <select className="w-full border rounded p-2 text-sm" value={assetId} onChange={e => setAssetId(e.target.value)}>
          <option value="">-- Select Available Asset --</option>
          {assets?.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <div className="flex gap-4">
          <input type="date" className="flex-1 border rounded p-2 text-sm" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <input type="date" className="flex-1 border rounded p-2 text-sm" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        <Button onClick={() => requestAsset.mutate()} disabled={!assetId || !startDate || requestAsset.isPending}>Submit Request</Button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <h3 className="font-medium mb-4">My Requests History</h3>
        <div className="space-y-2">
          {requests?.map((req: any) => (
            <div key={req.id} className="flex justify-between items-center p-3 border rounded text-sm">
              <div>
                <div className="font-medium">{req.asset?.name}</div>
                <div className="text-slate-500 text-xs">{req.start_date} to {req.end_date || 'Ongoing'}</div>
              </div>
              <span className={`px-2 py-1 rounded text-xs ${req.status === 'approved' ? 'bg-green-100 text-green-700' : req.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {req.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AssetApprovals() {
  const queryClient = useQueryClient();
  const { data: requests, isLoading } = useQuery({
    queryKey: ['asset_requests_all'],
    queryFn: async () => {
      const { data } = await supabase.from('asset_requests').select('*, asset:internal_assets(name), user:profiles(full_name)').eq('status', 'pending');
      return data;
    }
  });

  const approveRequest = useMutation({
    mutationFn: async ({ id, assetId, userId }: { id: string, assetId: string, userId: string }) => {
      await supabase.from('asset_requests').update({ status: 'approved' }).eq('id', id);
      await supabase.from('internal_assets').update({ status: 'in_use', current_holder_id: userId }).eq('id', assetId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset_requests_all'] });
      queryClient.invalidateQueries({ queryKey: ['internal_assets'] });
      toast.success('Request approved');
    }
  });

  const rejectRequest = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('asset_requests').update({ status: 'rejected' }).eq('id', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset_requests_all'] });
      toast.success('Request rejected');
    }
  });

  if (isLoading) return <Loader2 className="animate-spin text-slate-400" />;

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4 space-y-4">
      {(!requests || requests.length === 0) ? (
        <div className="text-center text-slate-500 py-8">No pending requests.</div>
      ) : (
        requests.map((req: any) => (
          <div key={req.id} className="flex justify-between items-center p-4 border rounded">
            <div>
              <div className="font-medium">{req.user?.full_name} requested {req.asset?.name}</div>
              <div className="text-sm text-slate-500">From {req.start_date} {req.end_date ? `to ${req.end_date}` : ''}</div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => approveRequest.mutate({ id: req.id, assetId: req.asset_id, userId: req.user_id })}>Approve</Button>
              <Button size="sm" variant="outline" className="text-red-600 border-red-200" onClick={() => rejectRequest.mutate(req.id)}>Reject</Button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function ManageAssets() {
  const queryClient = useQueryClient();
  const [newAsset, setNewAsset] = useState({ name: '', type: 'laptop', serial_number: '' });
  
  const { data: assets } = useQuery({ queryKey: ['internal_assets_manage'], queryFn: async () => (await supabase.from('internal_assets').select('*')).data });

  const addAsset = useMutation({
    mutationFn: async () => {
      await supabase.from('internal_assets').insert([{ ...newAsset, status: 'available' }]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal_assets_manage'] });
      queryClient.invalidateQueries({ queryKey: ['internal_assets'] });
      setNewAsset({ name: '', type: 'laptop', serial_number: '' });
      toast.success('Asset added');
    }
  });

  const reclaimAsset = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('internal_assets').update({ status: 'available', current_holder_id: null }).eq('id', id);
      // also mark any ongoing requests as completed
      await supabase.from('asset_requests').update({ status: 'returned' }).eq('asset_id', id).eq('status', 'approved');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal_assets_manage'] });
      queryClient.invalidateQueries({ queryKey: ['internal_assets'] });
      toast.success('Asset reclaimed');
    }
  });

  return (
    <div className="space-y-6">
      <div className="bg-slate-50 p-4 rounded-lg border flex gap-4 items-end">
        <div className="flex-1">
          <label className="text-xs font-medium">Asset Name</label>
          <input className="w-full border rounded p-2 text-sm" value={newAsset.name} onChange={e => setNewAsset({...newAsset, name: e.target.value})} />
        </div>
        <div>
          <label className="text-xs font-medium">Type</label>
          <select className="w-full border rounded p-2 text-sm" value={newAsset.type} onChange={e => setNewAsset({...newAsset, type: e.target.value})}>
            <option value="laptop">Laptop</option>
            <option value="monitor">Monitor</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="text-xs font-medium">Serial / Tag</label>
          <input className="w-full border rounded p-2 text-sm" value={newAsset.serial_number} onChange={e => setNewAsset({...newAsset, serial_number: e.target.value})} />
        </div>
        <Button onClick={() => addAsset.mutate()} disabled={!newAsset.name}><Plus className="h-4 w-4 mr-2" /> Add</Button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        {assets?.map((a: any) => (
          <div key={a.id} className="flex justify-between items-center p-3 border-b last:border-0">
            <div>
              <div className="font-medium">{a.name} ({a.type})</div>
              <div className="text-xs text-slate-500">Status: {a.status}</div>
            </div>
            {a.status === 'in_use' && (
              <Button size="sm" variant="outline" onClick={() => reclaimAsset.mutate(a.id)}>Reclaim Asset</Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
