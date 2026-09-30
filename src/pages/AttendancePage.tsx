import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DateRangePicker } from '@/components/shared/DateRangePicker';
import { ExportButton } from '@/components/shared/ExportButton';
import { exportToCSV, exportToExcel } from '@/lib/export';
import { format, subDays } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
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
        .select('id, full_name, roles, department:departments(name)')
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
          role: p.roles,
          department: (p.department as any)?.name || 'N/A',
          daysPresent,
          daysOnLeave,
          totalHours: Math.round(totalHours * 10) / 10,
          records: userRecords,
          leaves: userLeaves
        };
      });

      return report;
    }
  });

  const handleExport = (format: 'csv' | 'excel') => {
    if (!attendanceData) return;
    const exportData = attendanceData.map(d => ({
      Name: d.name,
      Role: Array.isArray(d.role) ? d.role.join(', ').replace(/_/g, ' ') : String(d.role || ''),
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
          <DateRangePicker startDate={dateRange.start} endDate={dateRange.end} onChange={(start, end) => setDateRange({ start, end })} />
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
                  <TableHead className="text-right w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendanceData?.map(row => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.name} <span className="text-xs text-slate-400 capitalize block">{Array.isArray(row.role) ? row.role.join(', ').replace(/_/g, ' ') : String(row.role || '').replace(/_/g, ' ')}</span></TableCell>
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


function AttendanceDetailsDialog({ user, startDate, endDate }: { user: any, startDate: Date, endDate: Date }) {
  const [open, setOpen] = useState(false);
  const startStr = format(startDate, 'MMM d, yyyy');
  const endStr = format(endDate, 'MMM d, yyyy');

  // Combine records and leaves into a single timeline
  const timeline: any[] = [];
  
  if (user.records) {
    user.records.forEach((r: any) => {
      timeline.push({
        date: new Date(r.date),
        type: 'presence',
        clock_in: r.clock_in,
        clock_out: r.clock_out,
        notes: r.notes
      });
    });
  }
  if (user.leaves) {
    user.leaves.forEach((l: any) => {
      timeline.push({
        date: new Date(l.allocation_date),
        type: 'leave',
        status: l.status
      });
    });
  }

  // Sort descending by date
  timeline.sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1">
          <FileText className="h-4 w-4 text-slate-500" />
          <span className="hidden sm:inline">Details</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {user.name} - Attendance Log
          </DialogTitle>
          <p className="text-sm text-slate-500">{startStr} to {endStr}</p>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto mt-4 pr-2">
          {timeline.length === 0 ? (
            <div className="py-10 text-center text-slate-500">
              No attendance or leave records in this period.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Clock In</TableHead>
                  <TableHead>Clock Out</TableHead>
                  <TableHead>Hours</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timeline.map((t: any, i: number) => {
                  let hours = 0;
                  if (t.type === 'presence' && t.clock_in && t.clock_out) {
                    const ms = new Date(t.clock_out).getTime() - new Date(t.clock_in).getTime();
                    hours = Math.round((ms / (1000 * 60 * 60)) * 10) / 10;
                  }
                  
                  return (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{format(t.date, 'EEE, MMM d')}</TableCell>
                      <TableCell>
                        {t.type === 'presence' ? (
                          <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">Present</span>
                        ) : (
                          <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium uppercase">{t.status?.replace('_', ' ')}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {t.type === 'presence' && t.clock_in ? format(new Date(t.clock_in), 'HH:mm') : '-'}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {t.type === 'presence' && t.clock_out ? format(new Date(t.clock_out), 'HH:mm') : '-'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {t.type === 'presence' && hours > 0 ? `${hours}h` : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
