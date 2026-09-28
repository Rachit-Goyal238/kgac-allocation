import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DateRangePicker } from '@/components/shared/DateRangePicker';
import { ExportButton } from '@/components/shared/ExportButton';
import { subMonths, addMonths, format, getDaysInMonth } from 'date-fns';
import { Loader2, TrendingUp, TrendingDown, DollarSign, Building, Clock, Briefcase } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { exportToCSV, exportToExcel } from '@/lib/export';

export function ReconciliationPage() {
  const [dateRange, setDateRange] = useState({ start: subMonths(new Date(), 1), end: addMonths(new Date(), 1) });
  const [zoneFilter, setZoneFilter] = useState('');

  // 1. Audit Margins Query
  const { data: marginData, isLoading: isLoadingAudits, isError: isErrorAudits } = useQuery({
    queryKey: ['auditMargins', dateRange, zoneFilter],
    queryFn: async () => {
      const startStr = format(dateRange.start, 'yyyy-MM-dd');
      const endStr = format(dateRange.end, 'yyyy-MM-dd');

      const { data: audits, error } = await supabase
        .from('audits')
        .select(`
          *,
          client:clients(name),
          project:projects(name, code, is_billable),
          teams:audit_teams(
            role, 
            vendor_id, 
            vendor_resource_id, 
            user_id,
            agreed_rate,
            vendor:vendors(name, default_human_rate, default_asset_rate),
            user:profiles(full_name, agreed_rate, monthly_salary, zone)
          )
        `)
        .gte('audit_date', startStr)
        .lte('audit_date', endStr)
        .neq('status', 'draft')
        .order('audit_date', { ascending: false });

      if (error) throw error;

      let filteredAudits = audits;
      if (zoneFilter) {
        filteredAudits = audits.filter(audit => {
          return audit.teams?.some((t: any) => t.user?.zone?.toLowerCase().includes(zoneFilter.toLowerCase()));
        });
      }

      return filteredAudits.map(audit => {
          let totalTeamCost = 0;
          let internalCount = 0;

          let days = 1;
          if (audit.end_date && audit.end_date !== audit.audit_date) {
              const diffTime = Math.abs(new Date(audit.end_date).getTime() - new Date(audit.audit_date).getTime());
              days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          }

          audit.teams?.forEach((team: any) => {
            if (team.vendor_id && team.vendor) {
              let rate = team.agreed_rate;
              if (!rate) {
                rate = team.role === 'asset' 
                  ? team.vendor.default_asset_rate 
                  : team.vendor.default_human_rate;
              }
              totalTeamCost += (Number(rate) || 0) * days;
            } else if (!team.vendor_id) {
              internalCount += 1;
              let intRate = team.agreed_rate;
              if (!intRate && team.user?.monthly_salary) {
                const auditDate = new Date(audit.audit_date || new Date());
                const daysInMonth = new Date(auditDate.getFullYear(), auditDate.getMonth() + 1, 0).getDate();
                intRate = Number(team.user.monthly_salary) / daysInMonth;
              } else if (!intRate) {
                intRate = team.user?.agreed_rate;
              }

              if (intRate) {
                  totalTeamCost += (Number(intRate) || 0) * days;
              }
            }
          });

          const isBillable = audit.project?.is_billable ?? true;
          const revenue = isBillable ? (audit.agreed_fees || 0) : 0;
          const margin = isBillable ? revenue - totalTeamCost : -totalTeamCost;
          const marginPercent = isBillable && revenue > 0 ? (margin / revenue) * 100 : 0;

          return {
            ...audit,
            audit_days: days,
            isBillable,
            metrics: {
              totalTeamCost,
              internalCount,
              revenue,
              margin,
              marginPercent
            }
          };
      });
    }
  });

  // 2. Project Billing Query (Manual Projects via Allocations)
  const { data: projectBilling, isLoading: isLoadingProjects } = useQuery({
    queryKey: ['projectBilling', dateRange, zoneFilter],
    queryFn: async () => {
      const startStr = format(dateRange.start, 'yyyy-MM-dd');
      const endStr = format(dateRange.end, 'yyyy-MM-dd');

      // 1. Fetch all non-draft projects
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .order('name');
        
      if (projectsError) throw projectsError;

      // 2. Fetch all allocations in the date range
      const { data: allocations, error: allocError } = await supabase
        .from('allocations')
        .select(`
          hours,
          status,
          allocation_date,
          project_id,
          audit_id,
          user:profiles(id, full_name, monthly_salary, agreed_rate, zone)
        `)
        .gte('allocation_date', startStr)
        .lte('allocation_date', endStr)
        .neq('status', 'pto')
        .neq('status', 'sick')
        .neq('status', 'public_holiday');
        
      if (allocError) throw allocError;

      // Group allocations by project
      const projectStats = projects.map(proj => {
        // Find all allocations for this project
        // Note: we can filter OUT audit allocations if we strictly only want "manual" project hours, 
        // but normally a Project view should show ALL hours billed to it (whether via audit or manual).
        // Let's only include ones without an audit_id, to represent "manually tracked projects" as requested.
        let projAllocations = allocations.filter(a => a.project_id === proj.id && !a.audit_id);
        
        if (zoneFilter) {
          projAllocations = projAllocations.filter(a => (a.user as any)?.zone?.toLowerCase().includes(zoneFilter.toLowerCase()));
        }

        let totalManDays = 0;
        let totalCost = 0;

        projAllocations.forEach(alloc => {
            const manDays = (alloc.hours || 0) / 8.0;
            totalManDays += manDays;

            if (alloc.user) {
                let dailyRate = (alloc.user as any).agreed_rate;
                if (!dailyRate && (alloc.user as any).monthly_salary) {
                    const allocDate = new Date(alloc.allocation_date);
                    const daysInMonth = new Date(allocDate.getFullYear(), allocDate.getMonth() + 1, 0).getDate();
                    dailyRate = Number((alloc.user as any).monthly_salary) / daysInMonth;
                }
                
                if (dailyRate) {
                    totalCost += manDays * Number(dailyRate);
                }
            }
        });

        return {
            ...proj,
            totalManDays,
            totalCost
        };
      }).filter(p => p.totalManDays > 0); // Only show projects with actual logged time

      return projectStats;
    }
  });

  const aggregateStats = marginData?.reduce((acc, curr) => ({
    totalRevenue: acc.totalRevenue + curr.metrics.revenue,
    totalCost: acc.totalCost + curr.metrics.totalTeamCost,
    totalMargin: acc.totalMargin + curr.metrics.margin,
  }), { totalRevenue: 0, totalCost: 0, totalMargin: 0 });

  const aggregateProjectStats = projectBilling?.reduce((acc, curr) => ({
      totalManDays: acc.totalManDays + curr.totalManDays,
      totalCost: acc.totalCost + curr.totalCost,
  }), { totalManDays: 0, totalCost: 0 });

  if (isLoadingAudits || isLoadingProjects) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Expense Billing</h1>
          <p className="text-gray-500">Track financial metrics across audits and projects.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <input 
              type="text" 
              placeholder="Filter by Zone..." 
              className="border rounded p-2 text-sm max-w-[150px]"
              value={zoneFilter} 
              onChange={e => setZoneFilter(e.target.value)} 
            />
            <DateRangePicker 
              startDate={dateRange.start} 
              endDate={dateRange.end} 
              onChange={(start, end) => setDateRange({ start: start || dateRange.start, end: end || dateRange.end })} 
            />
          </div>
        </div>
      </div>

      <Tabs defaultValue="audits" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="audits" className="flex items-center gap-2"><Briefcase className="h-4 w-4"/> Audits & Schedules</TabsTrigger>
          <TabsTrigger value="projects" className="flex items-center gap-2"><Building className="h-4 w-4"/> Manually Tracked Projects</TabsTrigger>
        </TabsList>

        <TabsContent value="audits">
            <div className="grid gap-4 md:grid-cols-3 mb-6">
                <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Billed Revenue</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">₹{aggregateStats?.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                </CardContent>
                </Card>
                <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Team Expense</CardTitle>
                    <TrendingDown className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-red-600">₹{aggregateStats?.totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    <p className="text-xs text-muted-foreground">Internal salaries + Vendor costs</p>
                </CardContent>
                </Card>
                <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Net Profit Margin</CardTitle>
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                    <div className={`text-2xl font-bold ${(aggregateStats?.totalMargin || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    ₹{aggregateStats?.totalMargin.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Audit Margins</CardTitle>
                        <CardDescription>Profitability breakdown for scheduled and completed audits</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <ExportButton 
                            onExport={async (exportFormat) => {
                                if (!marginData || marginData.length === 0) return;
                                const exportRows = marginData.map(d => ({
                                    'Audit Name': d.name,
                                    'Date': d.audit_date,
                                    'Days': d.audit_days,
                                    'Status': d.status,
                                    'Client': d.client?.name || '',
                                    'Project': d.project?.name || '',
                                    'Total Expense': d.metrics.totalTeamCost,
                                    'Agreed Revenue': d.metrics.revenue,
                                    'Margin': d.metrics.margin
                                }));
                                if (exportFormat === 'csv') exportToCSV(exportRows, `audit_margins_${format(new Date(), 'yyyy-MM-dd')}.csv`);
                                else exportToExcel(exportRows, undefined, `audit_margins_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
                            }}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Audit / Project</TableHead>
                        <TableHead>Date / Days</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right text-red-600">Team Expense</TableHead>
                        <TableHead className="text-right text-emerald-600">Agreed Revenue</TableHead>
                        <TableHead className="text-right">Net Margin</TableHead>
                        <TableHead className="text-right">Margin %</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {!marginData?.length ? (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No active audits found in this date range.
                            </TableCell>
                        </TableRow>
                        ) : (
                        marginData.map((audit) => (
                            <TableRow key={audit.id}>
                            <TableCell>
                                <div className="font-medium text-blue-900">{audit.name}</div>
                                <div className="text-xs text-muted-foreground">{audit.project?.name || 'No Project'}</div>
                                {!audit.isBillable && <span className="inline-flex mt-1 items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">Internal Non-Billable</span>}
                            </TableCell>
                            <TableCell>
                                <div>{format(new Date(audit.audit_date), 'MMM d, yyyy')}</div>
                                <div className="text-xs text-muted-foreground">{audit.audit_days} Day(s)</div>
                            </TableCell>
                            <TableCell>
                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
                                ${audit.status === 'completed' ? 'bg-purple-100 text-purple-800' : 
                                    audit.status === 'scheduled' ? 'bg-blue-100 text-blue-800' : 
                                    'bg-amber-100 text-amber-800'}`}>
                                {audit.status.charAt(0).toUpperCase() + audit.status.slice(1)}
                                </span>
                            </TableCell>
                            <TableCell className="text-right text-red-600 font-medium">
                                ₹{audit.metrics.totalTeamCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </TableCell>
                            <TableCell className="text-right text-emerald-600 font-medium">
                                {audit.isBillable ? `₹${audit.metrics.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : 'N/A'}
                            </TableCell>
                            <TableCell className={`text-right font-bold ${audit.metrics.margin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                ₹{audit.metrics.margin.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </TableCell>
                            <TableCell className={`text-right font-bold ${audit.metrics.marginPercent >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {audit.isBillable ? `${audit.metrics.marginPercent.toFixed(1)}%` : 'N/A'}
                            </TableCell>
                            </TableRow>
                        ))
                        )}
                    </TableBody>
                    </Table>
                </div>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="projects">
            <div className="grid gap-4 md:grid-cols-2 mb-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Man-Days Spent</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{aggregateProjectStats?.totalManDays.toFixed(1)} Days</div>
                        <p className="text-xs text-muted-foreground">From manual calendar allocations</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Internal Cost</CardTitle>
                        <TrendingDown className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">₹{aggregateProjectStats?.totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                        <p className="text-xs text-muted-foreground">Calculated from mapped salaries</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Manual Project Costs</CardTitle>
                        <CardDescription>Costs calculated dynamically based on time logged in the Calendar</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <ExportButton 
                            onExport={async (exportFormat) => {
                                if (!projectBilling || projectBilling.length === 0) return;
                                const exportRows = projectBilling.map(d => ({
                                    'Project Name': d.name,
                                    'Project Code': d.code,
                                    'Is Billable': d.is_billable ? 'Yes' : 'No',
                                    'Total Man Days': d.totalManDays,
                                    'Total Internal Cost': d.totalCost
                                }));
                                if (exportFormat === 'csv') exportToCSV(exportRows, `manual_project_costs_${format(new Date(), 'yyyy-MM-dd')}.csv`);
                                else exportToExcel(exportRows, undefined, `manual_project_costs_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
                            }}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Project Details</TableHead>
                        <TableHead>Billing Type</TableHead>
                        <TableHead className="text-right">Man-Days Spent</TableHead>
                        <TableHead className="text-right text-red-600">Calculated Cost</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {!projectBilling?.length ? (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            No manual time allocations found for projects in this date range.
                            </TableCell>
                        </TableRow>
                        ) : (
                        projectBilling.map((proj) => (
                            <TableRow key={proj.id}>
                            <TableCell>
                                <div className="font-medium text-blue-900">{proj.name}</div>
                                <div className="text-xs text-muted-foreground">{proj.code || 'No Code'}</div>
                            </TableCell>
                            <TableCell>
                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
                                ${proj.is_billable ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-800'}`}>
                                {proj.is_billable ? 'Billable' : 'Internal / Overhead'}
                                </span>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                                {proj.totalManDays.toFixed(2)} Days
                            </TableCell>
                            <TableCell className="text-right text-red-600 font-bold">
                                ₹{proj.totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </TableCell>
                            </TableRow>
                        ))
                        )}
                    </TableBody>
                    </Table>
                </div>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
