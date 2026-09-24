import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthContext } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Package, CalendarX, Clock, RotateCcw } from 'lucide-react';
import { format, differenceInCalendarDays } from 'date-fns';

export function OverdueAssetReminder() {
  const { user } = useAuthContext();
  const today = new Date().toISOString().split('T')[0];

  const { data: assetRequests } = useQuery({
    queryKey: ['my_overdue_assets', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asset_requests')
        .select('*, asset:internal_assets(name, type, serial_number)')
        .eq('user_id', user?.id)
        .in('status', ['approved', 'return_pending']);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const overdueRequests = assetRequests?.filter(
    (req: any) => req.status === 'approved' && req.end_date && req.end_date < today
  ) || [];

  const pendingReturnRequests = assetRequests?.filter(
    (req: any) => req.status === 'return_pending'
  ) || [];

  // Don't render if nothing is overdue and nothing is pending return
  if (overdueRequests.length === 0 && pendingReturnRequests.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* 1. Red Overdue Alert Card */}
      {overdueRequests.length > 0 && (
        <Card className="border-red-200 bg-red-50/50 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-red-100 p-1.5">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <CardTitle className="text-red-800 text-base">Asset Return Overdue</CardTitle>
                <CardDescription className="text-red-600/80 text-xs">
                  Please return the following equipment to IT or your manager as soon as possible.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {overdueRequests.map((req: any) => {
                const daysOverdue = differenceInCalendarDays(new Date(), new Date(req.end_date));
                return (
                  <div
                    key={req.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-red-200 bg-white p-3.5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-red-100 p-2">
                        <Package className="h-4 w-4 text-red-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">{req.asset?.name}</p>
                        <p className="text-xs text-slate-500 capitalize">
                          {req.asset?.type} {req.asset?.serial_number ? `• S/N: ${req.asset.serial_number}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <CalendarX className="h-3.5 w-3.5" />
                        Was due {format(new Date(req.end_date), 'MMM d, yyyy')}
                      </div>
                      <Badge className="bg-red-600 text-white hover:bg-red-700 text-[11px]">
                        {daysOverdue} day{daysOverdue !== 1 ? 's' : ''} overdue
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2. Amber Awaiting Return Confirmation Card */}
      {pendingReturnRequests.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/40 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-amber-100 p-1.5">
                <Clock className="h-5 w-5 text-amber-700" />
              </div>
              <div>
                <CardTitle className="text-amber-900 text-base">Awaiting Return Confirmation</CardTitle>
                <CardDescription className="text-amber-700/80 text-xs">
                  You marked the following asset{pendingReturnRequests.length > 1 ? 's' : ''} as returned. Your manager or IT admin will confirm receipt.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingReturnRequests.map((req: any) => (
                <div
                  key={req.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-amber-200 bg-white p-3.5"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-amber-100 p-2 mt-0.5">
                      <RotateCcw className="h-4 w-4 text-amber-700" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-semibold text-slate-900 text-sm">{req.asset?.name}</p>
                      <p className="text-xs text-slate-500 capitalize">
                        {req.asset?.type} {req.asset?.serial_number ? `• S/N: ${req.asset.serial_number}` : ''}
                      </p>
                      {req.return_notes && (
                        <p className="text-xs text-slate-600 italic bg-amber-50 px-2 py-1 rounded border border-amber-100 mt-1 inline-block">
                          Note: "{req.return_notes}"
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 sm:flex-col sm:items-end shrink-0">
                    {req.return_requested_at && (
                      <span className="text-[11px] text-slate-500">
                        Submitted {format(new Date(req.return_requested_at), 'MMM d, h:mm a')}
                      </span>
                    )}
                    <Badge className="bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-100 text-[11px]">
                      <Clock className="w-3 h-3 mr-1" /> Pending Confirmation
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
