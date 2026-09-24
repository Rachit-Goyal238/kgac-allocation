import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2,
  Plus,
  Monitor,
  Laptop,
  Smartphone,
  Mouse,
  Tablet,
  Check,
  X,
  RotateCcw,
  Clock,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  UserCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInCalendarDays } from 'date-fns';
import { AssetImportTool } from '@/components/admin/AssetImportTool';
import { MyHeldAssets } from '@/components/assets/MyHeldAssets';

export function AssetsPage() {
  const { profile } = useAuthContext();
  const isManagerOrAdmin = profile?.roles?.some(r => ['admin', 'super_admin', 'manager', 'hr'].includes(r));
  const [activeTab, setActiveTab] = useState('dashboard');

  // Quick badge count for My Held Assets
  const { data: myHeldCount } = useQuery({
    queryKey: ['my_held_count', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return 0;
      const { count, error } = await supabase
        .from('internal_assets')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', profile.id)
        .eq('status', 'in_use');
      if (error) return 0;
      return count || 0;
    },
    enabled: !!profile?.id,
  });

  return (
    <div className="flex flex-col h-full bg-slate-50/30 p-6 overflow-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Internal Assets</h2>
        <p className="text-sm text-slate-500 mt-1">Track equipment, check out gear, and manage returns.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4 flex flex-wrap gap-1">
          <TabsTrigger value="dashboard">Asset Dashboard</TabsTrigger>
          <TabsTrigger value="my-assets" className="flex items-center gap-1.5">
            My Held Assets
            {typeof myHeldCount === 'number' && myHeldCount > 0 && (
              <span className="ml-1 rounded-full bg-slate-900 text-white px-1.5 py-0.2 text-[10px] font-semibold">
                {myHeldCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="my-requests">My Requests</TabsTrigger>
          {isManagerOrAdmin && <TabsTrigger value="approvals">Approvals</TabsTrigger>}
          {isManagerOrAdmin && <TabsTrigger value="manage">Manage Assets</TabsTrigger>}
        </TabsList>

        <TabsContent value="dashboard" className="mt-0">
          <AssetDashboard />
        </TabsContent>
        <TabsContent value="my-assets" className="mt-0">
          <MyHeldAssets userId={profile?.id} onRequestTab={() => setActiveTab('my-requests')} />
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
    onError: (error: any) => {
      toast.error(error.message || 'Action failed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset_requests', userId] });
      queryClient.invalidateQueries({ queryKey: ['asset_requests_all'] });
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
          {requests?.map((req: any) => {
            const today = new Date().toISOString().split('T')[0];
            const isOverdue = req.status === 'approved' && req.end_date && req.end_date < today;
            const isReturnPending = req.status === 'return_pending';

            return (
              <div
                key={req.id}
                className={`flex justify-between items-center p-3 border rounded text-sm ${
                  isOverdue ? 'border-red-300 bg-red-50' : isReturnPending ? 'border-amber-300 bg-amber-50/30' : ''
                }`}
              >
                <div>
                  <div className="font-medium">{req.asset?.name}</div>
                  <div className="text-slate-500 text-xs">{req.start_date} to {req.end_date || 'Ongoing'}</div>
                  {isOverdue && (
                    <div className="text-xs text-red-600 font-medium mt-0.5 flex items-center gap-1">
                      ⚠ Return overdue — please return this asset
                    </div>
                  )}
                  {isReturnPending && (
                    <div className="text-xs text-amber-700 font-medium mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Return submitted — awaiting manager/admin confirmation
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium capitalize ${
                      req.status === 'approved'
                        ? 'bg-green-100 text-green-700'
                        : req.status === 'rejected'
                        ? 'bg-red-100 text-red-700'
                        : req.status === 'returned'
                        ? 'bg-slate-100 text-slate-600'
                        : req.status === 'return_pending'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {req.status === 'return_pending' ? 'Return Pending' : req.status}
                  </span>
                  {isOverdue && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-600 text-white">
                      OVERDUE
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AssetApprovals() {
  const queryClient = useQueryClient();
  const { profile } = useAuthContext();
  const [subTab, setSubTab] = useState<'borrows' | 'returns'>('borrows');

  const { data: requests, isLoading } = useQuery({
    queryKey: ['asset_requests_all', profile?.id],
    queryFn: async () => {
      const isAdmin = profile?.roles?.some(r => r === 'admin' || r === 'super_admin' || r === 'hr');
      const isManager = profile?.roles?.some(r => r === 'manager');
      
      let query = supabase.from('asset_requests')
        .select(`
          *,
          asset:internal_assets(id, name, type, serial_number),
          user:profiles!asset_requests_user_id_fkey(id, full_name, email, department_id)
        `)
        .in('status', ['pending', 'return_pending'])
        .order('created_at', { ascending: false });

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

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }
  });

  const borrowRequests = requests?.filter((r: any) => r.status === 'pending') || [];
  const returnConfirmations = requests?.filter((r: any) => r.status === 'return_pending') || [];

  // Approve a borrow request
  const approveBorrow = useMutation({
    mutationFn: async ({ id, assetId, userId }: { id: string; assetId: string; userId: string }) => {
      const { error: reqErr } = await supabase.from('asset_requests').update({ status: 'approved' }).eq('id', id);
      if (reqErr) throw reqErr;
      const { error: assetErr } = await supabase.from('internal_assets').update({ status: 'in_use', assigned_to: userId }).eq('id', assetId);
      if (assetErr) throw assetErr;
    },
    onError: (error: any) => {
      toast.error(error.message || 'Action failed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset_requests_all'] });
      queryClient.invalidateQueries({ queryKey: ['internal_assets'] });
      queryClient.invalidateQueries({ queryKey: ['internal_assets_avail'] });
      queryClient.invalidateQueries({ queryKey: ['my_held_assets'] });
      queryClient.invalidateQueries({ queryKey: ['my_held_count'] });
      toast.success('Borrow request approved');
    }
  });

  // Reject a borrow request
  const rejectBorrow = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('asset_requests').update({ status: 'rejected' }).eq('id', id);
      if (error) throw error;
    },
    onError: (error: any) => {
      toast.error(error.message || 'Action failed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset_requests_all'] });
      toast.success('Borrow request rejected');
    }
  });

  // Confirm a return: asset is marked available, request marked returned
  const confirmReturn = useMutation({
    mutationFn: async ({ requestId, assetId }: { requestId: string; assetId: string }) => {
      const { error: reqErr } = await supabase.from('asset_requests').update({ status: 'returned' }).eq('id', requestId);
      if (reqErr) throw reqErr;
      const { error: assetErr } = await supabase.from('internal_assets').update({ status: 'available', assigned_to: null }).eq('id', assetId);
      if (assetErr) throw assetErr;
    },
    onError: (error: any) => {
      toast.error(error.message || 'Action failed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset_requests_all'] });
      queryClient.invalidateQueries({ queryKey: ['internal_assets'] });
      queryClient.invalidateQueries({ queryKey: ['internal_assets_avail'] });
      queryClient.invalidateQueries({ queryKey: ['internal_assets_manage'] });
      queryClient.invalidateQueries({ queryKey: ['my_held_assets'] });
      queryClient.invalidateQueries({ queryKey: ['my_held_count'] });
      queryClient.invalidateQueries({ queryKey: ['my_overdue_assets'] });
      toast.success('Return confirmed! Asset is now available.');
    }
  });

  // Decline return confirmation: device not physically received, reverts back to approved
  const declineReturn = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase.from('asset_requests').update({
        status: 'approved',
        return_notes: null,
        return_requested_at: null
      }).eq('id', requestId);
      if (error) throw error;
    },
    onError: (error: any) => {
      toast.error(error.message || 'Action failed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset_requests_all'] });
      queryClient.invalidateQueries({ queryKey: ['my_held_assets'] });
      toast.info('Return confirmation declined. Asset remains checked out to employee.');
    }
  });

  if (isLoading) return <Loader2 className="animate-spin text-slate-400" />;

  return (
    <div className="bg-white rounded-lg shadow-sm border p-5 space-y-5">
      {/* Sub-tabs header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h3 className="font-semibold text-slate-900 text-base">Asset Approvals & Confirmations</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Review borrow requests and confirm physical asset returns.
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-lg border text-xs">
          <button
            onClick={() => setSubTab('borrows')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
              subTab === 'borrows'
                ? 'bg-white shadow-sm text-slate-900'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Borrow Requests
            {borrowRequests.length > 0 && (
              <span className="bg-blue-600 text-white rounded-full px-1.5 py-0.2 text-[10px]">
                {borrowRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setSubTab('returns')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
              subTab === 'returns'
                ? 'bg-white shadow-sm text-slate-900'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Return Confirmations
            {returnConfirmations.length > 0 && (
              <span className="bg-amber-600 text-white rounded-full px-1.5 py-0.2 text-[10px]">
                {returnConfirmations.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Subtab Content: Borrow Requests */}
      {subTab === 'borrows' && (
        <div className="space-y-3">
          {borrowRequests.length === 0 ? (
            <div className="text-center text-slate-500 py-8 text-sm">No pending borrow requests.</div>
          ) : (
            borrowRequests.map((req: any) => (
              <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-3 hover:bg-slate-50/50 transition-all">
                <div className="space-y-1">
                  <div className="font-medium text-slate-900 flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-blue-600" />
                    <span>{req.user?.full_name}</span>
                    <span className="text-slate-400 font-normal">requested</span>
                    <span className="text-slate-900 font-semibold">{req.asset?.name}</span>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> From {req.start_date} {req.end_date ? `to ${req.end_date}` : '(Ongoing)'}
                    </span>
                    {req.asset?.serial_number && (
                      <span className="font-mono text-slate-600">S/N: {req.asset.serial_number}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => approveBorrow.mutate({ id: req.id, assetId: req.asset_id, userId: req.user_id })}
                    disabled={approveBorrow.isPending}
                  >
                    <Check className="w-3.5 h-3.5 mr-1" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => rejectBorrow.mutate(req.id)}
                    disabled={rejectBorrow.isPending}
                  >
                    <X className="w-3.5 h-3.5 mr-1" /> Reject
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Subtab Content: Return Confirmations */}
      {subTab === 'returns' && (
        <div className="space-y-3">
          {returnConfirmations.length === 0 ? (
            <div className="text-center text-slate-500 py-8 text-sm">No assets pending return confirmation.</div>
          ) : (
            returnConfirmations.map((req: any) => {
              const today = new Date().toISOString().split('T')[0];
              const wasOverdue = req.end_date && req.end_date < today;

              return (
                <div
                  key={req.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-amber-200 bg-amber-50/30 rounded-lg gap-3 hover:bg-amber-50/50 transition-all"
                >
                  <div className="space-y-1.5">
                    <div className="font-medium text-slate-900 flex items-center gap-2 flex-wrap">
                      <RotateCcw className="w-4 h-4 text-amber-600" />
                      <span>{req.user?.full_name}</span>
                      <span className="text-slate-500 font-normal">marked as returned:</span>
                      <span className="text-slate-900 font-semibold">{req.asset?.name}</span>
                      {wasOverdue && (
                        <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px]">
                          Was Overdue
                        </Badge>
                      )}
                    </div>

                    <div className="text-xs text-slate-600 flex items-center gap-3 flex-wrap">
                      <span>Serial: <strong className="font-mono text-slate-800">{req.asset?.serial_number || 'N/A'}</strong></span>
                      <span>Assigned: {req.start_date} to {req.end_date || 'Ongoing'}</span>
                      {req.return_requested_at && (
                        <span className="text-slate-500">
                          Returned on {format(new Date(req.return_requested_at), 'MMM d, h:mm a')}
                        </span>
                      )}
                    </div>

                    {req.return_notes && (
                      <div className="text-xs bg-white p-2 rounded border border-amber-200 text-slate-700 italic">
                        User note: "{req.return_notes}"
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 sm:self-center shrink-0">
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => confirmReturn.mutate({ requestId: req.id, assetId: req.asset_id })}
                      disabled={confirmReturn.isPending}
                    >
                      <Check className="w-3.5 h-3.5 mr-1" /> Confirm Return
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-slate-700 border-slate-300 hover:bg-slate-100"
                      onClick={() => declineReturn.mutate(req.id)}
                      disabled={declineReturn.isPending}
                    >
                      <X className="w-3.5 h-3.5 mr-1" /> Decline
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
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
    onError: (error: any) => {
      toast.error(error.message || 'Action failed');
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
      await supabase.from('asset_requests').update({ status: 'returned' }).eq('asset_id', id).in('status', ['approved', 'return_pending']);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Action failed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal_assets_manage'] });
      queryClient.invalidateQueries({ queryKey: ['internal_assets'] });
      queryClient.invalidateQueries({ queryKey: ['internal_assets_avail'] });
      queryClient.invalidateQueries({ queryKey: ['asset_requests_all'] });
      queryClient.invalidateQueries({ queryKey: ['my_held_assets'] });
      queryClient.invalidateQueries({ queryKey: ['my_held_count'] });
      queryClient.invalidateQueries({ queryKey: ['my_overdue_assets'] });
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
