import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthContext } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Package, CalendarX } from 'lucide-react';
import { format, differenceInCalendarDays } from 'date-fns';

export function OverdueAssetReminder() {
  const { user } = useAuthContext();
  const today = new Date().toISOString().split('T')[0];

  const { data: overdueRequests } = useQuery({
    queryKey: ['my_overdue_assets', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asset_requests')
        .select('*, asset:internal_assets(name, type)')
        .eq('user_id', user?.id)
        .eq('status', 'approved')
        .lt('end_date', today) // end_date is in the past
        .not('end_date', 'is', null); // only requests that had an end date

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Don't render if nothing is overdue
  if (!overdueRequests || overdueRequests.length === 0) return null;

  return (
    <Card className="border-red-200 bg-red-50/50 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-red-100 p-1.5">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <CardTitle className="text-red-800">Asset Return Overdue</CardTitle>
            <CardDescription className="text-red-600/80">
              Please return the following asset{overdueRequests.length > 1 ? 's' : ''} to the IT desk as soon as possible.
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
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-red-200 bg-white p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-red-100 p-2">
                    <Package className="h-4 w-4 text-red-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{req.asset?.name}</p>
                    <p className="text-xs text-slate-500 capitalize">{req.asset?.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <CalendarX className="h-3.5 w-3.5" />
                    Was due {format(new Date(req.end_date), 'MMM d, yyyy')}
                  </div>
                  <Badge className="bg-red-600 text-white hover:bg-red-700">
                    {daysOverdue} day{daysOverdue !== 1 ? 's' : ''} overdue
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
