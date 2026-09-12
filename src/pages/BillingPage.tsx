import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DateRangePicker } from '@/components/shared/DateRangePicker';
import { ExportButton } from '@/components/shared/ExportButton';
import { useBillingMetrics } from '@/hooks/useBillingMetrics';
import Papa from 'papaparse';

export function BillingPage() {
  const [dateRange, setDateRange] = useState({ start: new Date(new Date().setMonth(new Date().getMonth() - 1)), end: new Date() });
  const { data, isLoading } = useBillingMetrics(dateRange);

  if (isLoading || !data) return <div className="p-8">Loading billing data...</div>;
  
  const { totalOwed, owedByVendor, owedByAudit, externalResources } = data;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Audit Expense Dashboard</h1>
        <div className="flex gap-4">
          <DateRangePicker 
            startDate={dateRange.start} 
            endDate={dateRange.end} 
            onChange={(start, end) => setDateRange({ start, end })} 
          />
          <ExportButton 
            onExport={(format) => {
              if (format !== 'csv') {
                alert('Only CSV export is supported right now.');
                return;
              }
              const exportData = externalResources.map(r => ({
                'Audit': r.audit_name,
                'Date': r.audit_date,
                'Vendor': r.vendor,
                'Role': r.role,
                'Amount (INR)': r.amount
              }));
              
              const csv = Papa.unparse(exportData);
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.setAttribute('download', `vendor_expenses_${dateRange.start.toISOString().split('T')[0]}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Vendor Expense</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₹{totalOwed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Expenses by Vendor</CardTitle>
            <CardDescription>Total amount owed to each vendor in this period.</CardDescription>
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
                {owedByAudit.map((a: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{a.audit_name}</TableCell>
                    <TableCell>{a.client_name}</TableCell>
                    <TableCell className="text-right">₹{a.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vendor Line Items</CardTitle>
          <CardDescription>Detailed view of all vendor assignments within this period.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Audit Name</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Amount Owed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {externalResources.map((res: any, idx: number) => (
                <TableRow key={idx}>
                  <TableCell>{res.audit_date}</TableCell>
                  <TableCell>{res.audit_name}</TableCell>
                  <TableCell>{res.vendor}</TableCell>
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
