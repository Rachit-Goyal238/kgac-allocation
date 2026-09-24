import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DateRangePicker } from '@/components/shared/DateRangePicker';
import { ExportButton } from '@/components/shared/ExportButton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useManDaysMetrics } from '@/hooks/useManDaysMetrics';

export function ManDaysPage() {
  const [dateRange, setDateRange] = useState({ start: new Date(new Date().getFullYear(), new Date().getMonth(), 1), end: new Date() });
  const [zoneFilter, setZoneFilter] = useState('');
  const [showBreakdown, setShowBreakdown] = useState(false);
  const { data, isLoading, isError } = useManDaysMetrics(dateRange, zoneFilter);

  if (isLoading) return <div className="p-8 flex justify-center text-slate-500">Loading man-days data...</div>;
  if (isError || !data) return <div className="p-8 flex justify-center text-red-500">Failed to load data. Please try again.</div>;

  const { totalManDays, internalManDays, externalManDays, byProject, byMonth } = data;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Man-Days Dashboard</h1>
          <p className="text-muted-foreground text-sm">Overview of team and vendor effort across projects.</p>
        </div>
        <div className="flex gap-4 items-center">
           <div className="flex items-center space-x-2">
            <Switch id="breakdown" checked={showBreakdown} onCheckedChange={setShowBreakdown} />
            <Label htmlFor="breakdown">Show Breakdown</Label>
          </div>
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
            onExport={(format) => {
              const exportData = byProject.map(p => ({
                'Project': p.project_name,
                'Total Man-Days': p.total,
                'Internal': p.internal,
                'External': p.external
              }));
              
              if (format === 'csv') {
                import('@/lib/export').then(m => m.exportToCSV(exportData, 'man_days_report.csv'));
              } else {
                import('@/lib/export').then(m => m.exportToExcel(
                  exportData,
                  [
                    { header: 'Project', key: 'Project', width: 30 },
                    { header: 'Total Man-Days', key: 'Total Man-Days', width: 20 },
                    { header: 'Internal', key: 'Internal', width: 20 },
                    { header: 'External', key: 'External', width: 20 }
                  ],
                  'man_days_report.xlsx'
                ));
              }
            }} 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card><CardHeader><CardTitle>Total Man-Days</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{totalManDays.toFixed(1)}</p></CardContent></Card>
        <Card><CardHeader><CardTitle>Internal Man-Days</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-blue-600">{internalManDays.toFixed(1)}</p></CardContent></Card>
        <Card><CardHeader><CardTitle>External Man-Days</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-green-600">{externalManDays.toFixed(1)}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Man-Days Trend</CardTitle></CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={byMonth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <RechartsTooltip />
              <Area type="monotone" dataKey="total" stroke="#8884d8" fill="#8884d8" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Man-Days by Project</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Total Man-Days</TableHead>
                {showBreakdown && (
                  <>
                    <TableHead>Internal</TableHead>
                    <TableHead>External</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {byProject.map((proj: any) => (
                <TableRow key={proj.project_id}>
                  <TableCell>{proj.project_name}</TableCell>
                  <TableCell>{proj.total.toFixed(1)}</TableCell>
                  {showBreakdown && (
                    <>
                      <TableCell>{proj.internal.toFixed(1)}</TableCell>
                      <TableCell>{proj.external.toFixed(1)}</TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
