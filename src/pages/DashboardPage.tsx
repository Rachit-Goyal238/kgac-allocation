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
      {/* Top Header: Dashboard Overview with its own labeled Date Range Picker */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h2>
          <p className="text-sm text-slate-500 mt-0.5">Overview of resource utilization and capacity metrics.</p>
        </div>
        {isManagerOrAdmin && (
          <div className="flex items-center gap-2.5 flex-wrap">
            <input 
              type="text" 
              placeholder="Filter by Zone..." 
              className="border border-input rounded-md px-3 h-10 text-sm max-w-[150px] bg-white shadow-xs"
              value={zoneFilter}
              onChange={e => setZoneFilter(e.target.value)}
            />
            <div className="flex items-center gap-2 bg-white px-2.5 py-1 rounded-md border border-input shadow-xs">
              <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Metrics Period:</span>
              <DateRangePicker 
                startDate={dashboardStartDate}
                endDate={dashboardEndDate}
                onChange={(start, end) => {
                  if (start) setDashboardStartDate(start);
                  if (end) setDashboardEndDate(end);
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Visual Section Separator */}
      <div className="relative pt-1 pb-1">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-slate-200/80" />
        </div>
        <div className="relative flex justify-start">
          <span className="bg-slate-50/90 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Upcoming Field Assignments
          </span>
        </div>
      </div>

      {/* Personal reminder cards — visible to all users */}
      <OverdueAssetReminder />

      {/* My Upcoming Audits Card (Contains its own date range picker and search inside the card header) */}
      <MyUpcomingAudits 
        startDate={auditsStartStr} 
        endDate={auditsEndStr}
        pickerStartDate={auditsStartDate}
        pickerEndDate={auditsEndDate}
        onDateChange={(start, end) => {
          if (start) setAuditsStartDate(start);
          if (end) setAuditsEndDate(end);
        }}
      />

      {isManagerOrAdmin && (
        <>
          {/* Visual Divider before Analytics */}
          <div className="relative pt-4 pb-1">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-slate-200/80" />
            </div>
            <div className="relative flex justify-start">
              <span className="bg-slate-50/90 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Resource Utilization & Capacity
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="flex-1 flex items-center justify-center min-h-[350px]">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center text-red-500 min-h-[350px]">
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
