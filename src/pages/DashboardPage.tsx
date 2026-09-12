import React, { useState } from 'react';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { MetricCards } from '@/components/dashboard/MetricCards';
import { UtilizationChart } from '@/components/dashboard/UtilizationChart';
import { IdleDaysTable } from '@/components/dashboard/IdleDaysTable';
import { OverAllocationChart } from '@/components/dashboard/OverAllocationChart';
import { LeaveApprovals } from '@/components/admin/LeaveApprovals';
import { MyUpcomingAudits } from '@/components/dashboard/MyUpcomingAudits';
import { DateRangePicker } from '@/components/shared/DateRangePicker';
import { subDays, format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';

export function DashboardPage() {
  const [startDate, setStartDate] = useState(subDays(new Date(), 14));
  const [endDate, setEndDate] = useState(new Date());
  const { profile } = useAuthContext();
  
  const startStr = format(startDate, 'yyyy-MM-dd');
  const endStr = format(endDate, 'yyyy-MM-dd');

  const { data, isLoading, error } = useDashboardMetrics(startStr, endStr);

  const isManagerOrAdmin = profile?.roles?.some(r => ['admin', 'super_admin', 'manager', 'planner'].includes(r));

  return (
    <div className="flex flex-col h-full bg-slate-50/50 p-6 space-y-6 overflow-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h2>
          <p className="text-sm text-slate-500">Overview of resource utilization and capacity.</p>
        </div>
        {isManagerOrAdmin && (
          <DateRangePicker 
            startDate={startDate}
            endDate={endDate}
            onChange={(start, end) => {
              if (start) setStartDate(start);
              if (end) setEndDate(end);
            }}
          />
        )}
      </div>

      <MyUpcomingAudits />

      {isManagerOrAdmin && (
        <>
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center min-h-[400px]">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center text-red-500 min-h-[400px]">
              Error loading metrics: {(error as Error).message}
            </div>
          ) : data ? (
            <>
              <MetricCards metrics={data.metrics} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <UtilizationChart data={data.dailyUtilization} />
                <OverAllocationChart entries={data.overAllocationEntries} />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <IdleDaysTable entries={data.idleDayEntries} />
                <LeaveApprovals />
              </div>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
