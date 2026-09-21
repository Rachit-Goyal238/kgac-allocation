import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus, Monitor, Laptop, Smartphone, Mouse, Tablet } from 'lucide-react';
import { toast } from 'sonner';
import { AssetImportTool } from '@/components/admin/AssetImportTool';

export function AssetsPage() {
  const { profile } = useAuthContext();
  const isManagerOrAdmin = profile?.roles?.some(r => ['admin', 'super_admin', 'manager', 'hr'].includes(r));
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

        <TabsContent value="dashboard" className="mt-0">
          <AssetDashboard />
        </TabsContent>
        <TabsContent value="my-requests" className="mt-0">
          <MyAssetRequests userId={profile?.id} />
        </TabsContent>
        {isManagerOrAdmin && (
          <TabsContent value="approvals" className="mt-0">
            <AssetApprovals />
          </TabsContent>
        )}
        {isManagerOrAdmin && (
          <TabsContent value="manage" className="mt-0">
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
        *, assigned_profile:profiles!internal_assets_assigned_to_fkey(full_name)
      `);
      return data;
    }
  });

  if (isLoading) return <Loader2 className="animate-spin text-slate-400" />;

  const getIcon = (type: string) => {
    switch(type) {
      case 'laptop': return <Laptop className="h-5 w-5 text-slate-500" />;
      case 'phone': return <Smartphone className="h-5 w-5 text-slate-500" />;
      case 'mouse': return <Mouse className="h-5 w-5 text-slate-500" />;
      case 'hht': return <Tablet className="h-5 w-5 text-slate-500" />;
      default: return <Monitor className="h-5 w-5 text-slate-500" />;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {assets?.map((asset: any) => (
        <div key={asset.id} className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              {getIcon(asset.type)}
              <div className="font-medium">{asset.name}</div>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${asset.status === 'available' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
              {asset.status}
            </span>
          </div>
          <div className="mt-4 text-sm text-slate-600">
            <div>S/N: {asset.serial_number || 'N/A'}</div>
            <div className="mt-1">Current Holder: <span className="font-medium text-slate-900">{asset.assigned_profile?.full_name || 'None'}</span></div>
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

  const { data: assets } = useQuery({ queryKey: ['internal_assets_avail'], queryFn: async () => (await supabase.from('internal_assets').select('*').eq('status', 'available')).data });
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
  const { profile } = useAuthContext();

  const { data: requests, isLoading } = useQuery({
    queryKey: ['asset_requests_all', profile?.id],
    queryFn: async () => {
      const isAdmin = profile?.roles?.some(r => r === 'admin' || r === 'super_admin' || r === 'hr');
      const isManager = profile?.roles?.some(r => r === 'manager');
      
      let query = supabase.from('asset_requests')
        .select('*, asset:internal_assets(name), user:profiles!asset_requests_user_id_fkey(full_name)')
        .eq('status', 'pending');

      if (!isAdmin) {
        if (isManager && profile?.department_id) {
          const { data: deptProfiles } = await supabase.from('profiles').select('id').eq('department_id', profile.department_id);
          const userIds = deptProfiles?.map(p => p.id) || [];
          if (userIds.length > 0) {
            query = query.in('user_id', userIds);
          } else {
            query = query.eq('user_id', '00000000-0000-0000-0000-000000000000');
          }
        } else {
           query = query.eq('manager_id', profile?.id);
        }
      }

      const { data } = await query;
      return data;
    }
  });

  const approveRequest = useMutation({
    mutationFn: async ({ id, assetId, userId }: { id: string, assetId: string, userId: string }) => {
      await supabase.from('asset_requests').update({ status: 'approved' }).eq('id', id);
      await supabase.from('internal_assets').update({ status: 'in_use', assigned_to: userId }).eq('id', assetId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset_requests_all'] });
      queryClient.invalidateQueries({ queryKey: ['internal_assets'] });
      queryClient.invalidateQueries({ queryKey: ['internal_assets_avail'] });
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
  
  const { data: assets } = useQuery({ queryKey: ['internal_assets_manage'], queryFn: async () => (await supabase.from('internal_assets').select('*').order('created_at', { ascending: false })).data });

  const addAsset = useMutation({
    mutationFn: async () => {
      await supabase.from('internal_assets').insert([{ ...newAsset, status: 'available' }]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal_assets_manage'] });
      queryClient.invalidateQueries({ queryKey: ['internal_assets'] });
      queryClient.invalidateQueries({ queryKey: ['internal_assets_avail'] });
      setNewAsset({ name: '', type: 'laptop', serial_number: '' });
      toast.success('Asset added');
    }
  });

  const reclaimAsset = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('internal_assets').update({ status: 'available', assigned_to: null }).eq('id', id);
      // also mark any ongoing requests as completed
      await supabase.from('asset_requests').update({ status: 'returned' }).eq('asset_id', id).eq('status', 'approved');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal_assets_manage'] });
      queryClient.invalidateQueries({ queryKey: ['internal_assets'] });
      queryClient.invalidateQueries({ queryKey: ['internal_assets_avail'] });
      toast.success('Asset reclaimed');
    }
  });

  return (
    <div className="space-y-6">
      
      <AssetImportTool />

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
            <option value="hht">HHT</option>
            <option value="phone">Phone</option>
            <option value="mouse">Mouse</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="text-xs font-medium">Serial / Tag</label>
          <input className="w-full border rounded p-2 text-sm" value={newAsset.serial_number} onChange={e => setNewAsset({...newAsset, serial_number: e.target.value})} />
        </div>
        <Button onClick={() => addAsset.mutate()} disabled={!newAsset.name}><Plus className="h-4 w-4 mr-2" /> Add Single</Button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-4 font-medium border-b bg-slate-50 rounded-t-lg">Asset Directory</div>
        <div className="max-h-[400px] overflow-auto">
          {assets?.map((a: any) => (
            <div key={a.id} className="flex justify-between items-center p-3 border-b last:border-0">
              <div>
                <div className="font-medium">{a.name} <span className="text-slate-500 font-normal">({a.type})</span></div>
                <div className="text-xs text-slate-500">Status: {a.status} {a.serial_number ? `| S/N: ${a.serial_number}` : ''}</div>
              </div>
              {a.status === 'in_use' && (
                <Button size="sm" variant="outline" onClick={() => reclaimAsset.mutate(a.id)}>Reclaim Asset</Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
