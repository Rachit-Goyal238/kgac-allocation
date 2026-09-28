import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DateRangePicker } from '@/components/shared/DateRangePicker';
import { ExportButton } from '@/components/shared/ExportButton';
import { exportToCSV, exportToExcel } from '@/lib/export';
import { format, subDays } from 'date-fns';
import { Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';

export function AttendancePage() {
  const [dateRange, setDateRange] = useState({ start: subDays(new Date(), 7), end: new Date() });

  const { data: attendanceData, isLoading } = useQuery({
    queryKey: ['attendance_report', dateRange],
    queryFn: async () => {
      const startStr = format(dateRange.start, 'yyyy-MM-dd');
      const endStr = format(dateRange.end, 'yyyy-MM-dd');

      // Get all active internal profiles
      const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select('id, full_name, role, department:departments(name)')
        .eq('status', 'active');
      if (profErr) throw profErr;

      // Get attendance records
      const { data: records, error: attErr } = await supabase
        .from('attendance')
        .select('*')
        .gte('date', startStr)
        .lte('date', endStr);
      if (attErr) throw attErr;

      // Get approved leaves (PTO, sick)
      const { data: leaves, error: leaveErr } = await supabase
        .from('allocations')
        .select('user_id, allocation_date, status')
        .eq('is_approved', true)
        .in('status', ['pto', 'sick', 'public_holiday'])
        .gte('allocation_date', startStr)
        .lte('allocation_date', endStr);
      if (leaveErr) throw leaveErr;

      // Map everything
      const report = profiles.map(p => {
        // Group by date
        const userRecords = records.filter(r => r.user_id === p.id);
        const userLeaves = leaves.filter(l => l.user_id === p.id);
        
        let totalHours = 0;
        let daysPresent = 0;
        let daysOnLeave = 0;

        userRecords.forEach(r => {
          if (r.clock_in && r.clock_out) {
            const ms = new Date(r.clock_out).getTime() - new Date(r.clock_in).getTime();
            totalHours += ms / (1000 * 60 * 60);
          }
          daysPresent++;
        });

        daysOnLeave = userLeaves.length;

        return {
          id: p.id,
          name: p.full_name,
          role: p.role,
          department: p.department?.name || 'N/A',
          daysPresent,
          daysOnLeave,
          totalHours: Math.round(totalHours * 10) / 10,
          records: userRecords,
          leaves: userLeaves
        };
      });

      return report.sort((a, b) => a.name.localeCompare(b.name));
    }
  });

  const handleExport = (format: 'csv' | 'excel') => {
    if (!attendanceData) return;
    const exportData = attendanceData.map(d => ({
      Name: d.name,
      Role: d.role,
      Department: d.department,
      'Days Present': d.daysPresent,
      'Days On Leave': d.daysOnLeave,
      'Total Hours': d.totalHours
    }));
    const filename = `attendance_report_${new Date().toISOString().split('T')[0]}`;
    if (format === 'csv') exportToCSV(exportData, `${filename}.csv`);
    else exportToExcel(exportData, [], `${filename}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Attendance Monitor</h1>
          <p className="text-slate-500 text-sm">Track employee clock-ins, clock-outs, and approved leaves.</p>
        </div>
        <div className="flex gap-4">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <ExportButton onExport={handleExport} disabled={!attendanceData || attendanceData.length === 0} />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-slate-400" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-center">Days Present</TableHead>
                  <TableHead className="text-center">Days On Leave</TableHead>
                  <TableHead className="text-right">Total Hours</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendanceData?.map(row => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.name} <span className="text-xs text-slate-400 capitalize block">{row.role.replace('_', ' ')}</span></TableCell>
                    <TableCell>{row.department}</TableCell>
                    <TableCell className="text-center font-medium text-emerald-600">{row.daysPresent}</TableCell>
                    <TableCell className="text-center font-medium text-amber-600">{row.daysOnLeave}</TableCell>
                    <TableCell className="text-right font-bold">{row.totalHours}h</TableCell>
                  </TableRow>
                ))}
                {attendanceData?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">No active employees found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
