import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DateRangePicker } from '@/components/shared/DateRangePicker';
import { ExportButton } from '@/components/shared/ExportButton';
import { useBillingMetrics } from '@/hooks/useBillingMetrics';
import { exportToCSV, exportToExcel } from '@/lib/export';
import { format, subMonths, addMonths } from 'date-fns';
import { Loader2, TrendingDown, Clock, Building, Briefcase } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function BillingPage() {
  const [dateRange, setDateRange] = useState({ start: subMonths(new Date(), 1), end: addMonths(new Date(), 1) });
  const [zoneFilter, setZoneFilter] = useState('');
  
  // Tab 1: Original Audit Expense metrics
  const { data: auditData, isLoading: isLoadingAudits } = useBillingMetrics(dateRange, zoneFilter);

  // Tab 2: Manual Project metrics
  const { data: projectBilling, isLoading: isLoadingProjects } = useQuery({
    queryKey: ['projectBilling', dateRange, zoneFilter],
    queryFn: async () => {
      const startStr = format(dateRange.start, 'yyyy-MM-dd');
      const endStr = format(dateRange.end, 'yyyy-MM-dd');

      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .order('name');
        
      if (projectsError) throw projectsError;

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

      const projectStats = projects.map(proj => {
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
      }).filter(p => p.totalManDays > 0);

      return projectStats;
    }
  });

  const aggregateProjectStats = projectBilling?.reduce((acc, curr) => ({
      totalManDays: acc.totalManDays + curr.totalManDays,
      totalCost: acc.totalCost + curr.totalCost,
  }), { totalManDays: 0, totalCost: 0 });


  if (isLoadingAudits || isLoadingProjects || !auditData) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-gray-500" /></div>;
  }
  
  const { totalOwed, owedByVendor, owedByAudit, externalResources } = auditData;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold">Expense Billing</h1>
            <p className="text-gray-500 text-sm">Track team costs and expenses across all active work streams.</p>
        </div>
        <div className="flex gap-4">
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

      <Tabs defaultValue="audits" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="audits" className="flex items-center gap-2"><Briefcase className="h-4 w-4"/> Audits Expenses</TabsTrigger>
          <TabsTrigger value="projects" className="flex items-center gap-2"><Building className="h-4 w-4"/> Manual Projects Expenses</TabsTrigger>
        </TabsList>

        <TabsContent value="audits" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Resource Cost</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">&#x20B9;{totalOwed.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">in selected period</p>
                </CardContent>
                </Card>
                <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Resources</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{externalResources.length}</div>
                    <p className="text-xs text-muted-foreground">billed to audits</p>
                </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                <CardHeader>
                    <CardTitle>Expenses by Vendor/Source</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={owedByVendor}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <RechartsTooltip formatter={(value: number) => `&#x20B9;${value.toLocaleString()}`} />
                        <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                    </ResponsiveContainer>
                </CardContent>
                </Card>
                <Card>
                <CardHeader>
                    <CardTitle>Expenses by Audit</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={owedByAudit}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <RechartsTooltip formatter={(value: number) => `&#x20B9;${value.toLocaleString()}`} />
                        <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                    </ResponsiveContainer>
                </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Detailed Audit Resources Ledger</CardTitle>
                    <CardDescription>Line item breakdown of all team expenses</CardDescription>
                </div>
                <ExportButton 
                    onExport={async (exportFormat) => {
                    const exportData = externalResources.map(r => ({
                        'Audit': r.audit_name,
                        'Date': r.audit_date,
                        'Resource Type': r.vendor,
                        'Resource Name': r.resource_name,
                        'Role': r.role,
                        'Amount (INR)': r.amount
                    }));
                    
                    const filename = `audit_expenses_${format(dateRange.start, 'yyyy-MM-dd')}`;

                    if (exportFormat === 'csv') {
                        exportToCSV(exportData, `${filename}.csv`);
                    } else {
                        exportToExcel(exportData, undefined, `${filename}.xlsx`);
                    }
                    }} 
                />
                </CardHeader>
                <CardContent>
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Audit</TableHead>
                        <TableHead>Source/Vendor</TableHead>
                        <TableHead>Resource</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="text-right">Amount Billed</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {externalResources.map((r, i) => (
                        <TableRow key={i}>
                        <TableCell>
                            <div className="font-medium">{r.audit_name}</div>
                            <div className="text-xs text-muted-foreground">{r.audit_date}</div>
                        </TableCell>
                        <TableCell>
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            r.vendor === 'Internal Profile' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                            {r.vendor}
                            </span>
                        </TableCell>
                        <TableCell>{r.resource_name}</TableCell>
                        <TableCell className="capitalize">{r.role.replace('_', ' ')}</TableCell>
                        <TableCell className="text-right font-medium">&#x20B9;{r.amount.toLocaleString()}</TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="projects" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
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
                        <div className="text-2xl font-bold text-red-600">&#x20B9;{aggregateProjectStats?.totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
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
                                &#x20B9;{proj.totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
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
