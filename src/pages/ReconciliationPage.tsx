import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DateRangePicker } from '@/components/shared/DateRangePicker';
import { ExportButton } from '@/components/shared/ExportButton';
import { subMonths, addMonths, format } from 'date-fns';
import { Loader2, TrendingUp, TrendingDown, DollarSign, Building } from 'lucide-react';
import Papa from 'papaparse';

export function ReconciliationPage() {
  const [dateRange, setDateRange] = useState({ start: subMonths(new Date(), 1), end: addMonths(new Date(), 1) });

  const { data: marginData, isLoading } = useQuery({
    queryKey: ['auditMargins', dateRange],
    queryFn: async () => {
      const startStr = format(dateRange.start, 'yyyy-MM-dd');
      const endStr = format(dateRange.end, 'yyyy-MM-dd');

      const { data: audits, error } = await supabase
        .from('audits')
        .select(`
          id, store_name, store_code, audit_date, status, billing_amount,
          client:clients(name),
          teams:audit_teams(
            role, agreed_rate, vendor_id,
            vendor:vendors(name, default_human_rate, default_asset_rate)
          )
        `)
        .gte('audit_date', startStr)
        .lte('audit_date', endStr)
        .order('audit_date', { ascending: false });

      if (error) throw error;

      return audits.map(audit => {
        let totalTeamCost = 0;
        let internalCount = 0;

        audit.teams?.forEach((team: any) => {
          if (team.vendor_id && team.vendor) {
            let rate = team.agreed_rate;
            if (!rate) {
              rate = team.role === 'asset' 
                ? team.vendor.default_asset_rate 
                : team.vendor.default_human_rate;
            }
            totalTeamCost += Number(rate) || 0;
          } else if (!team.vendor_id) {
            internalCount += 1;
            if (team.agreed_rate) {
              totalTeamCost += Number(team.agreed_rate);
            }
          }
        });

        const billing = Number(audit.billing_amount) || 0;
        const grossMargin = billing - totalTeamCost;
        const marginPercent = billing > 0 ? (grossMargin / billing) * 100 : 0;

        return {
          id: audit.id,
          date: audit.audit_date,
          client: (audit.client as any)?.name || 'Unknown',
          store: `${audit.store_name} ${audit.store_code ? `(${audit.store_code})` : ''}`,
          status: audit.status,
          billing,
          teamCost: totalTeamCost,
          internalCount,
          grossMargin,
          marginPercent
        };
      });
    }
  });

  const totals = marginData?.reduce((acc, curr) => {
    acc.revenue += curr.billing;
    acc.cost += curr.teamCost;
    acc.margin += curr.grossMargin;
    return acc;
  }, { revenue: 0, cost: 0, margin: 0 }) || { revenue: 0, cost: 0, margin: 0 };

  const overallMarginPercent = totals.revenue > 0 ? (totals.margin / totals.revenue) * 100 : 0;

  return (
    <div className="flex flex-col h-full bg-slate-50/50 p-6 space-y-6 overflow-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Audit Margin Report</h2>
          <p className="text-sm text-slate-500">Track revenue, team costs, and gross margins per audit.</p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker 
            startDate={dateRange.start} 
            endDate={dateRange.end} 
            onChange={(start, end) => setDateRange({ start: start || dateRange.start, end: end || dateRange.end })} 
          />
          <ExportButton 
            onExport={(exportFormat) => {
              if (exportFormat !== 'csv' || !marginData) return;
              const csv = Papa.unparse(marginData.map(d => ({
                'Date': d.date,
                'Client': d.client,
                'Store': d.store,
                'Status': d.status,
                'Internal Staff': d.internalCount,
                'Billing Revenue': d.billing,
                'Team Cost': d.teamCost,
                'Gross Margin': d.grossMargin,
                'Margin %': d.marginPercent.toFixed(1) + '%'
              })));
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.setAttribute('download', `audit_margins_${format(dateRange.start, 'yyyy-MM-dd')}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="w-4 h-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₹{totals.revenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">From scheduled audits</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Team Cost</CardTitle>
            <Building className="w-4 h-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">₹{totals.cost.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Direct external + internal expenses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Gross Margin</CardTitle>
            {overallMarginPercent > 30 ? (
              <TrendingUp className="w-4 h-4 text-green-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">₹{totals.margin.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">{overallMarginPercent.toFixed(1)}% margin</p>
          </CardContent>
        </Card>
      </div>

      <Card className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 bg-white shadow-sm z-10">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Client & Store</TableHead>
                  <TableHead>Internal Staff</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Team Cost</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {marginData?.map((audit) => (
                  <TableRow key={audit.id}>
                    <TableCell className="whitespace-nowrap">{format(new Date(audit.date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-900">{audit.client}</div>
                      <div className="text-xs text-slate-500">{audit.store}</div>
                    </TableCell>
                    <TableCell>{audit.internalCount} {audit.internalCount === 1 ? 'person' : 'people'}</TableCell>
                    <TableCell className="text-right font-medium text-green-700">₹{audit.billing.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-medium text-orange-700">₹{audit.teamCost.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="font-medium text-blue-700">₹{audit.grossMargin.toLocaleString()}</div>
                      <div className="text-xs text-slate-500">{audit.marginPercent.toFixed(1)}%</div>
                    </TableCell>
                  </TableRow>
                ))}
                {marginData?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No audits found in this date range.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>
    </div>
  );
}
