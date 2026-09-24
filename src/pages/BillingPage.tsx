import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DateRangePicker } from '@/components/shared/DateRangePicker';
import { ExportButton } from '@/components/shared/ExportButton';
import { useBillingMetrics } from '@/hooks/useBillingMetrics';
import { exportToCSV, exportToExcel } from '@/lib/export';
import { format } from 'date-fns';

export function BillingPage() {
  const [dateRange, setDateRange] = useState({ start: new Date(new Date().setMonth(new Date().getMonth() - 1)), end: new Date() });
  const [zoneFilter, setZoneFilter] = useState('');
  const { data, isLoading } = useBillingMetrics(dateRange, zoneFilter);

  if (isLoading || !data) return <div className="p-8">Loading billing data...</div>;
  
  const { totalOwed, owedByVendor, owedByAudit, externalResources } = data;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Audit Expense Dashboard</h1>
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
            onChange={(start, end) => setDateRange({ start, end })} 
          />
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
                const columns = [
                  { header: 'Audit', key: 'Audit', width: 26 },
                  { header: 'Date', key: 'Date', width: 14 },
                  { header: 'Resource Type', key: 'Resource Type', width: 18 },
                  { header: 'Resource Name', key: 'Resource Name', width: 24 },
                  { header: 'Role', key: 'Role', width: 18 },
                  { header: 'Amount (INR)', key: 'Amount (INR)', width: 16 }
                ];
                await exportToExcel(exportData, columns, `${filename}.xlsx`);
              }
            }} 
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Team Expense</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₹{totalOwed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Expenses by Resource Type</CardTitle>
            <CardDescription>Total amount owed to each vendor or internal pool in this period.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={owedByVendor} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={(value) => `₹${value}`} />
                <YAxis dataKey="vendor" type="category" width={100} />
                <RechartsTooltip formatter={(value: number) => [`₹${value.toFixed(2)}`, 'Amount']} />
                <Bar dataKey="amount" fill="#8884d8" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Expenses by Audit</CardTitle>
            <CardDescription>Cost breakdown per audit engagement.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Audit Name</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {owedByAudit.map((a: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{a.audit_name}</TableCell>
                    <TableCell className="text-muted-foreground">{a.client_name}</TableCell>
                    <TableCell className="text-right font-medium">₹{a.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Expense Line Items</CardTitle>
          <CardDescription>Detailed view of all resource assignments with cost within this period.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Audit Name</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Amount Owed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {externalResources.map((res: any, idx: number) => (
                <TableRow key={idx}>
                  <TableCell>{res.audit_date}</TableCell>
                  <TableCell>{res.audit_name}</TableCell>
                  <TableCell>{res.resource_name}</TableCell>
                  <TableCell className="capitalize">{res.role}</TableCell>
                  <TableCell className="text-right">₹{res.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
