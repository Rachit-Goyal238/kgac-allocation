import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Loader2,
  Package,
  Laptop,
  Smartphone,
  Mouse,
  Tablet,
  Monitor,
  Clock,
  CheckCircle2,
  RotateCcw,
  AlertTriangle,
  Calendar,
  FileText,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInCalendarDays } from 'date-fns';

interface MyHeldAssetsProps {
  userId?: string;
  onRequestTab?: () => void;
}

export function MyHeldAssets({ userId, onRequestTab }: MyHeldAssetsProps) {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];

  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [returnNotes, setReturnNotes] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch approved or return_pending requests for this user
  const { data: heldItems, isLoading } = useQuery({
    queryKey: ['my_held_assets', userId],
    queryFn: async () => {
      if (!userId) return [];

      // 1. Fetch asset_requests with status 'approved' or 'return_pending'
      const { data: requests, error: reqError } = await supabase
        .from('asset_requests')
        .select('*, asset:internal_assets(*)')
        .eq('user_id', userId)
        .in('status', ['approved', 'return_pending'])
        .order('created_at', { ascending: false });

      if (reqError) throw reqError;

      // 2. Also check if any asset is directly assigned to this user in internal_assets
      const { data: directAssets, error: assetError } = await supabase
        .from('internal_assets')
        .select('*')
        .eq('assigned_to', userId)
        .eq('status', 'in_use');

      if (assetError) throw assetError;

      const coveredAssetIds = new Set((requests || []).map((r: any) => r.asset_id));
      const uncoveredAssets = (directAssets || []).filter((a: any) => !coveredAssetIds.has(a.id));

      const merged = [
        ...(requests || []),
        ...uncoveredAssets.map((a: any) => ({
          id: null, // synthetic request
          asset_id: a.id,
          user_id: userId,
          start_date: format(new Date(), 'yyyy-MM-dd'),
          end_date: null,
          status: 'approved',
          asset: a,
          created_at: a.created_at,
        })),
      ];

      return merged;
    },
    enabled: !!userId,
  });

  // Mutation to initiate return
  const markAsReturned = useMutation({
    mutationFn: async ({ requestId, assetId, notes }: { requestId: string | null; assetId: string; notes: string }) => {
      const timestamp = new Date().toISOString();

      if (requestId) {
        // Update existing request to return_pending
        const { error } = await supabase
          .from('asset_requests')
          .update({
            status: 'return_pending',
            return_notes: notes.trim() || null,
            return_requested_at: timestamp,
          })
          .eq('id', requestId);

        if (error) throw error;
      } else {
        // Create a new request directly in return_pending state
        const { error } = await supabase.from('asset_requests').insert([
          {
            user_id: userId,
            asset_id: assetId,
            start_date: format(new Date(), 'yyyy-MM-dd'),
            end_date: format(new Date(), 'yyyy-MM-dd'),
            status: 'return_pending',
            return_notes: notes.trim() || null,
            return_requested_at: timestamp,
          },
        ]);

        if (error) throw error;
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to submit return request');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my_held_assets', userId] });
      queryClient.invalidateQueries({ queryKey: ['asset_requests', userId] });
      queryClient.invalidateQueries({ queryKey: ['asset_requests_all'] });
      queryClient.invalidateQueries({ queryKey: ['my_overdue_assets', userId] });
      queryClient.invalidateQueries({ queryKey: ['internal_assets'] });
      queryClient.invalidateQueries({ queryKey: ['internal_assets_manage'] });
      toast.success('Return initiated! Awaiting confirmation from your manager or IT admin.');
      setIsDialogOpen(false);
      setSelectedRequest(null);
      setReturnNotes('');
    },
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'laptop':
        return <Laptop className="h-6 w-6 text-slate-600" />;
      case 'phone':
        return <Smartphone className="h-6 w-6 text-slate-600" />;
      case 'mouse':
        return <Mouse className="h-6 w-6 text-slate-600" />;
      case 'hht':
        return <Tablet className="h-6 w-6 text-slate-600" />;
      default:
        return <Monitor className="h-6 w-6 text-slate-600" />;
    }
  };

  const handleOpenReturnDialog = (req: any) => {
    setSelectedRequest(req);
    setReturnNotes('');
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!heldItems || heldItems.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-slate-200 p-12 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 mb-4">
          <Package className="h-7 w-7 text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900">No Assets Currently Held</h3>
        <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
          You do not have any company equipment checked out. If you need equipment for audits or daily work, you can submit a request.
        </p>
        {onRequestTab && (
          <Button onClick={onRequestTab} className="mt-5" size="sm">
            <Plus className="h-4 w-4 mr-1.5" /> Request Equipment
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900 text-lg">Currently Held Equipment</h3>
          <p className="text-xs text-slate-500">
            Items currently checked out under your name. When finished, mark them returned for manager confirmation.
          </p>
        </div>
        <Badge variant="outline" className="bg-white">
          {heldItems.length} Asset{heldItems.length !== 1 ? 's' : ''} Checked Out
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {heldItems.map((item: any, idx: number) => {
          const asset = item.asset;
          const isPendingReturn = item.status === 'return_pending';
          const isOverdue =
            item.status === 'approved' &&
            item.end_date &&
            item.end_date < today;

          const daysOverdue = isOverdue
            ? differenceInCalendarDays(new Date(), new Date(item.end_date))
            : 0;

          return (
            <div
              key={item.id || `direct-${idx}`}
              className={`bg-white rounded-xl border p-5 shadow-sm transition-all flex flex-col justify-between ${
                isOverdue
                  ? 'border-red-300 ring-1 ring-red-200'
                  : isPendingReturn
                  ? 'border-amber-300 bg-amber-50/20'
                  : 'border-slate-200 hover:shadow'
              }`}
            >
              <div>
                {/* Header: Icon, Name & Status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 border">
                      {getIcon(asset?.type)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 leading-snug">{asset?.name || 'Unnamed Asset'}</h4>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mt-0.5">{asset?.type}</p>
                    </div>
                  </div>

                  {isPendingReturn ? (
                    <Badge className="bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100 whitespace-nowrap text-[11px]">
                      <Clock className="w-3 h-3 mr-1" /> Return Pending
                    </Badge>
                  ) : isOverdue ? (
                    <Badge className="bg-red-600 text-white hover:bg-red-700 whitespace-nowrap text-[11px]">
                      Overdue ({daysOverdue}d)
                    </Badge>
                  ) : (
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-100 whitespace-nowrap text-[11px]">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Active
                    </Badge>
                  )}
                </div>

                {/* Details */}
                <div className="mt-4 space-y-2 text-xs text-slate-600 border-t pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Serial / Tag:</span>
                    <span className="font-mono text-slate-800">{asset?.serial_number || 'N/A'}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> Checked Out:
                    </span>
                    <span>
                      {item.start_date ? format(new Date(item.start_date), 'MMM d, yyyy') : 'Recently'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Due Date:</span>
                    <span className={isOverdue ? 'font-semibold text-red-600' : ''}>
                      {item.end_date ? format(new Date(item.end_date), 'MMM d, yyyy') : 'Ongoing'}
                    </span>
                  </div>

                  {/* Return pending details */}
                  {isPendingReturn && (
                    <div className="mt-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200/80 text-[11px] text-amber-800 space-y-1">
                      <p className="font-medium flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Return submitted
                      </p>
                      <p className="text-amber-700/90">
                        Awaiting confirmation from your manager or IT administrator to complete return.
                      </p>
                      {item.return_notes && (
                        <p className="text-slate-600 italic border-t border-amber-200/60 pt-1 mt-1">
                          "{item.return_notes}"
                        </p>
                      )}
                    </div>
                  )}

                  {isOverdue && !isPendingReturn && (
                    <div className="mt-2 p-2 rounded bg-red-50 border border-red-200 text-red-700 text-[11px] flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                      <span>This asset is past its due date. Please return it to IT.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-5 pt-3 border-t">
                {isPendingReturn ? (
                  <Button variant="outline" size="sm" disabled className="w-full text-slate-400 bg-slate-50 text-xs">
                    <Clock className="w-3.5 h-3.5 mr-1.5" /> Awaiting Confirmation
                  </Button>
                ) : (
                  <Button
                    variant={isOverdue ? 'default' : 'outline'}
                    size="sm"
                    className={`w-full text-xs font-medium ${
                      isOverdue ? 'bg-red-600 hover:bg-red-700 text-white' : 'border-slate-300 hover:bg-slate-50'
                    }`}
                    onClick={() => handleOpenReturnDialog(item)}
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Mark as Returned
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Return Confirmation Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-blue-600" /> Return Asset
            </DialogTitle>
            <DialogDescription>
              Mark <strong className="text-slate-900">{selectedRequest?.asset?.name}</strong> as physically returned.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm">
            <div className="rounded-lg bg-slate-50 p-3 border space-y-1 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Asset:</span>
                <span className="font-medium text-slate-900">{selectedRequest?.asset?.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Serial / Tag:</span>
                <span className="font-mono text-slate-900">{selectedRequest?.asset?.serial_number || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span>Assigned Period:</span>
                <span>
                  {selectedRequest?.start_date} to {selectedRequest?.end_date || 'Ongoing'}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" /> Return Notes (Optional)
              </label>
              <textarea
                placeholder="e.g. Returned to IT Desk floor 2, handed over to manager, all cables and charger included..."
                rows={3}
                className="w-full border rounded-lg p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent resize-none"
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
              />
              <p className="text-[11px] text-slate-500">
                Your manager or IT administrator will be notified to confirm physical receipt of this equipment.
              </p>
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(false)} disabled={markAsReturned.isPending}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() =>
                markAsReturned.mutate({
                  requestId: selectedRequest?.id,
                  assetId: selectedRequest?.asset_id || selectedRequest?.asset?.id,
                  notes: returnNotes,
                })
              }
              disabled={markAsReturned.isPending}
            >
              {markAsReturned.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Submitting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Submit Return
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
