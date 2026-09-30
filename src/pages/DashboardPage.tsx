import React, { useState } from 'react';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { MetricCards } from '@/components/dashboard/MetricCards';
import { UtilizationChart } from '@/components/dashboard/UtilizationChart';
import { IdleDaysTable } from '@/components/dashboard/IdleDaysTable';
import { OverAllocationChart } from '@/components/dashboard/OverAllocationChart';
import { LeaveApprovals } from '@/components/admin/LeaveApprovals';
import { MyUpcomingAudits } from '@/components/dashboard/MyUpcomingAudits';
import { OverdueAssetReminder } from '@/components/dashboard/OverdueAssetReminder';
import { NotificationAlerts } from '@/components/dashboard/NotificationAlerts';
import { DateRangePicker } from '@/components/shared/DateRangePicker';
import { addMonths, subMonths, format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';

export function DashboardPage() {
  // 1. Dashboard Overview Metrics: previous 3 months to today
  const [dashboardStartDate, setDashboardStartDate] = useState(subMonths(new Date(), 3));
  const [dashboardEndDate, setDashboardEndDate] = useState(new Date());

  // 2. Upcoming Audits: today to next 3 months
  const [auditsStartDate, setAuditsStartDate] = useState(new Date());
  const [auditsEndDate, setAuditsEndDate] = useState(addMonths(new Date(), 3));

  const [zoneFilter, setZoneFilter] = useState<string>('');
  const { profile } = useAuthContext();
  
  const dashboardStartStr = format(dashboardStartDate, 'yyyy-MM-dd');
  const dashboardEndStr = format(dashboardEndDate, 'yyyy-MM-dd');

  const auditsStartStr = format(auditsStartDate, 'yyyy-MM-dd');
  const auditsEndStr = format(auditsEndDate, 'yyyy-MM-dd');

  const { data, isLoading, error } = useDashboardMetrics(dashboardStartStr, dashboardEndStr, undefined, zoneFilter || undefined);

  const isManagerOrAdmin = profile?.roles?.some(r => ['admin', 'super_admin', 'manager', 'planner'].includes(r));

  return (
    <div className="flex flex-col h-full bg-slate-50/50 p-6 space-y-6 overflow-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h2>
          <p className="text-sm text-slate-500">Overview of resource utilization and capacity.</p>
        </div>
        {isManagerOrAdmin && (
          <div className="flex gap-2 items-center flex-wrap">
            <input 
              type="text" 
              placeholder="Filter by Zone..." 
              className="border rounded p-2 text-sm max-w-[150px] bg-white"
              value={zoneFilter}
              onChange={e => setZoneFilter(e.target.value)}
            />
            <DateRangePicker 
              startDate={dashboardStartDate}
              endDate={dashboardEndDate}
              onChange={(start, end) => {
                if (start) setDashboardStartDate(start);
                if (end) setDashboardEndDate(end);
              }}
            />
          </div>
        )}
      </div>

      {/* Personal reminder cards — visible to all users */}
      <OverdueAssetReminder />

      {/* Upcoming Audits Section with its own dedicated DateRangePicker */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-base font-semibold text-slate-800">My Upcoming Audits</h3>
            <p className="text-xs text-slate-500">Your assigned audits for the scheduled period</p>
          </div>
          <DateRangePicker
            startDate={auditsStartDate}
            endDate={auditsEndDate}
            onChange={(start, end) => {
              if (start) setAuditsStartDate(start);
              if (end) setAuditsEndDate(end);
            }}
          />
        </div>
        <MyUpcomingAudits startDate={auditsStartStr} endDate={auditsEndStr} />
      </div>

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
