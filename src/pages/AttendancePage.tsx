import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DateRangePicker } from '@/components/shared/DateRangePicker';
import { ExportButton } from '@/components/shared/ExportButton';
import { exportToCSV, exportToExcel } from '@/lib/export';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Loader2, Calendar, LayoutList } from 'lucide-react';

interface DayAttendance {
  date: Date;
  dateStr: string;
  status: 'present' | 'half_day' | 'absent' | 'leave';
  label: 'P' | 'HD' | 'A' | 'L';
  units: number;
  hours: number;
  clock_in?: string;
  clock_out?: string;
  leaveStatus?: string;
}

export function AttendancePage() {
  const [dateRange, setDateRange] = useState({ start: subDays(new Date(), 6), end: new Date() });
  const [viewMode, setViewMode] = useState<'sheet' | 'summary'>('sheet');

  const daysInRange = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });

  const { data: attendanceData, isLoading } = useQuery({
    queryKey: ['attendance_report', dateRange],
    queryFn: async () => {
      const startStr = format(dateRange.start, 'yyyy-MM-dd');
      const endStr = format(dateRange.end, 'yyyy-MM-dd');

      // Get all active internal profiles
      const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select('id, full_name, roles, department:departments(name)')
        .eq('status', 'active')
        .order('full_name');
      if (profErr) throw profErr;

      // Get attendance records
      const { data: records, error: attErr } = await supabase
        .from('attendance')
        .select('*')
        .gte('date', startStr)
        .lte('date', endStr);
      if (attErr) throw attErr;

      // Get approved leaves (PTO, sick, holiday)
      const { data: leaves, error: leaveErr } = await supabase
        .from('allocations')
        .select('user_id, allocation_date, status')
        .eq('is_approved', true)
        .in('status', ['pto', 'sick', 'public_holiday'])
        .gte('allocation_date', startStr)
        .lte('allocation_date', endStr);
      if (leaveErr) throw leaveErr;

      const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });

      // Compute attendance per employee based on hours (>= 5.0h = 1.0, >= 4.0h = 0.5, < 4.0h = 0.0)
      const report = profiles.map(p => {
        const userRecords = records.filter(r => r.user_id === p.id);
        const userLeaves = leaves.filter(l => l.user_id === p.id);

        let totalUnits = 0;
        let fullDaysCount = 0;
        let halfDaysCount = 0;
        let leavesCount = 0;
        let totalHours = 0;

        const dayMap: Record<string, DayAttendance> = {};

        days.forEach(d => {
          const dStr = format(d, 'yyyy-MM-dd');
          const record = userRecords.find(r => r.date === dStr);
          const leave = userLeaves.find(l => l.allocation_date === dStr);

          let status: 'present' | 'half_day' | 'absent' | 'leave' = 'absent';
          let label: 'P' | 'HD' | 'A' | 'L' = 'A';
          let units = 0;
          let hours = 0;

          if (leave) {
            status = 'leave';
            label = 'L';
            units = 0;
            leavesCount++;
          } else if (record && record.clock_in) {
            if (record.clock_out) {
              const ms = new Date(record.clock_out).getTime() - new Date(record.clock_in).getTime();
              hours = Math.round((ms / (1000 * 60 * 60)) * 10) / 10;
            } else {
              const isToday = dStr === format(new Date(), 'yyyy-MM-dd');
              if (isToday) {
                const ms = new Date().getTime() - new Date(record.clock_in).getTime();
                hours = Math.round((ms / (1000 * 60 * 60)) * 10) / 10;
              }
            }

            totalHours += hours;

            if (hours >= 5.0) {
              status = 'present';
              label = 'P';
              units = 1.0;
              fullDaysCount++;
            } else if (hours >= 4.0) {
              status = 'half_day';
              label = 'HD';
              units = 0.5;
              halfDaysCount++;
            } else {
              status = 'absent';
              label = 'A';
              units = 0.0;
            }
          }

          totalUnits += units;

          dayMap[dStr] = {
            date: d,
            dateStr: dStr,
            status,
            label,
            units,
            hours,
            clock_in: record?.clock_in,
            clock_out: record?.clock_out,
            leaveStatus: leave?.status
          };
        });

        return {
          id: p.id,
          name: p.full_name,
          role: p.roles,
          department: (p.department as any)?.name || 'N/A',
          daysPresent: totalUnits,
          fullDays: fullDaysCount,
          halfDays: halfDaysCount,
          daysOnLeave: leavesCount,
          totalHours: Math.round(totalHours * 10) / 10,
          dayMap,
          records: userRecords,
          leaves: userLeaves
        };
      });

      return report;
    }
  });

  const handleExport = (exportFormat: 'csv' | 'excel') => {
    if (!attendanceData) return;

    let exportData: any[];

    if (viewMode === 'sheet') {
      // Export full date-wise attendance sheet
      exportData = attendanceData.map(d => {
        const rowObj: any = {
          Name: d.name,
          Role: Array.isArray(d.role) ? d.role.join(', ').replace(/_/g, ' ') : String(d.role || ''),
          Department: d.department,
          'Total Days Present': d.daysPresent,
          'Half Days (0.5)': d.halfDays,
          'Days On Leave': d.daysOnLeave
        };

        // Add columns for each date
        daysInRange.forEach(day => {
          const dStr = format(day, 'yyyy-MM-dd');
          const dayData = d.dayMap[dStr];
          rowObj[format(day, 'dd-MMM (EEE)')] = dayData ? dayData.label : 'A';
        });

        return rowObj;
      });
    } else {
      // Export summary view
      exportData = attendanceData.map(d => ({
        Name: d.name,
        Role: Array.isArray(d.role) ? d.role.join(', ').replace(/_/g, ' ') : String(d.role || ''),
        Department: d.department,
        'Days Present': d.daysPresent,
        'Full Days (1.0)': d.fullDays,
        'Half Days (0.5)': d.halfDays,
        'Days On Leave': d.daysOnLeave
      }));
    }

    const filename = `attendance_${viewMode}_${new Date().toISOString().split('T')[0]}`;
    if (exportFormat === 'csv') exportToCSV(exportData, `${filename}.csv`);
    else exportToExcel(exportData, [], `${filename}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Attendance Sheet</h1>
          <p className="text-slate-500 text-sm">Monitor daily employee attendance, half-days, and approved leaves.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
            <Button
              variant={viewMode === 'sheet' ? 'secondary' : 'ghost'}
              size="sm"
              className={`h-8 gap-1.5 px-3 text-xs ${viewMode === 'sheet' ? 'font-semibold bg-slate-100 text-slate-900' : 'text-slate-500'}`}
              onClick={() => setViewMode('sheet')}
            >
              <Calendar className="h-3.5 w-3.5" />
              Daily Sheet
            </Button>
            <Button
              variant={viewMode === 'summary' ? 'secondary' : 'ghost'}
              size="sm"
              className={`h-8 gap-1.5 px-3 text-xs ${viewMode === 'summary' ? 'font-semibold bg-slate-100 text-slate-900' : 'text-slate-500'}`}
              onClick={() => setViewMode('summary')}
            >
              <LayoutList className="h-3.5 w-3.5" />
              Summary
            </Button>
          </div>

          <DateRangePicker startDate={dateRange.start} endDate={dateRange.end} onChange={(start, end) => setDateRange({ start, end })} />
          <ExportButton onExport={handleExport} disabled={!attendanceData || attendanceData.length === 0} />
        </div>
      </div>

      {/* Legend Banner */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-600 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
        <span className="font-semibold text-slate-800">Attendance Key:</span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-5 flex items-center justify-center rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[11px]">P</span>
          <span>Full Day Present (1.0) &ge; 5.0h</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-5 flex items-center justify-center rounded bg-amber-100 text-amber-800 border border-amber-300 font-bold text-[11px]">HD</span>
          <span>Half Day (0.5) 4.0h &ndash; 5.0h</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-5 flex items-center justify-center rounded bg-blue-100 text-blue-800 border border-blue-300 font-bold text-[11px]">L</span>
          <span>Approved Leave</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-5 flex items-center justify-center rounded bg-rose-50 text-rose-600 border border-rose-200 font-bold text-[11px]">A</span>
          <span>Absent / &lt; 4.0h</span>
        </span>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-slate-400" /></div>
          ) : viewMode === 'sheet' ? (
            /* Date-by-Date Attendance Sheet Matrix */
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80">
                    <TableHead className="min-w-[180px] sticky left-0 bg-slate-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Employee</TableHead>
                    <TableHead className="min-w-[120px]">Department</TableHead>
                    <TableHead className="text-center min-w-[100px] font-semibold text-slate-900 bg-slate-100/50">Days Present</TableHead>
                    {daysInRange.map(d => (
                      <TableHead key={d.toISOString()} className="text-center min-w-[65px] px-1.5 py-2">
                        <div className="text-[11px] font-semibold text-slate-800">{format(d, 'd MMM')}</div>
                        <div className="text-[10px] text-slate-400 font-normal uppercase">{format(d, 'EEE')}</div>
                      </TableHead>
                    ))}
                    <TableHead className="text-right w-[80px] pr-4"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceData?.map(row => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                        <div className="font-medium text-slate-900">{row.name}</div>
                        <div className="text-xs text-slate-400 capitalize">{Array.isArray(row.role) ? row.role.join(', ').replace(/_/g, ' ') : String(row.role || '').replace(/_/g, ' ')}</div>
                      </TableCell>
                      <TableCell className="text-slate-600 text-sm">{row.department}</TableCell>
                      <TableCell className="text-center font-bold text-slate-900 bg-slate-50/50">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs">
                          {row.daysPresent}
                        </span>
                      </TableCell>
                      {daysInRange.map(d => {
                        const dStr = format(d, 'yyyy-MM-dd');
                        const dayData = row.dayMap[dStr];
                        const label = dayData?.label || 'A';
                        const status = dayData?.status || 'absent';

                        let badgeClass = 'bg-rose-50 text-rose-500 border-rose-200';
                        let tooltipText = 'Absent / Unclocked';

                        if (status === 'present') {
                          badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
                          tooltipText = `Present (1.0 Day)${dayData?.clock_in ? ` | In: ${format(new Date(dayData.clock_in), 'HH:mm')}` : ''}${dayData?.clock_out ? ` Out: ${format(new Date(dayData.clock_out), 'HH:mm')}` : ''}`;
                        } else if (status === 'half_day') {
                          badgeClass = 'bg-amber-100 text-amber-800 border-amber-300 font-bold';
                          tooltipText = `Half Day (0.5 Day)${dayData?.clock_in ? ` | In: ${format(new Date(dayData.clock_in), 'HH:mm')}` : ''}${dayData?.clock_out ? ` Out: ${format(new Date(dayData.clock_out), 'HH:mm')}` : ''}`;
                        } else if (status === 'leave') {
                          badgeClass = 'bg-blue-100 text-blue-800 border-blue-300 font-bold';
                          tooltipText = `Approved Leave (${dayData?.leaveStatus?.replace(/_/g, ' ') || 'Leave'})`;
                        }

                        return (
                          <TableCell key={dStr} className="text-center p-1.5" title={tooltipText}>
                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded text-xs border ${badgeClass} transition-transform hover:scale-110 cursor-default`}>
                              {label}
                            </span>
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right pr-4">
                        <AttendanceDetailsDialog user={row} startDate={dateRange.start} endDate={dateRange.end} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {attendanceData?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={daysInRange.length + 4} className="text-center py-12 text-slate-500">
                        No active employees found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          ) : (
            /* Summary View */
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-center">Total Days Present</TableHead>
                  <TableHead className="text-center">Full Days (1.0)</TableHead>
                  <TableHead className="text-center">Half Days (0.5)</TableHead>
                  <TableHead className="text-center">Days On Leave</TableHead>
                  <TableHead className="text-right w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendanceData?.map(row => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      <div>{row.name}</div>
                      <span className="text-xs text-slate-400 capitalize">{Array.isArray(row.role) ? row.role.join(', ').replace(/_/g, ' ') : String(row.role || '').replace(/_/g, ' ')}</span>
                    </TableCell>
                    <TableCell className="text-slate-600">{row.department}</TableCell>
                    <TableCell className="text-center font-bold text-emerald-700">
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200">
                        {row.daysPresent} Days
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-slate-700 font-medium">{row.fullDays}</TableCell>
                    <TableCell className="text-center text-amber-700 font-medium">{row.halfDays}</TableCell>
                    <TableCell className="text-center text-blue-700 font-medium">{row.daysOnLeave}</TableCell>
                    <TableCell className="text-right">
                      <AttendanceDetailsDialog user={row} startDate={dateRange.start} endDate={dateRange.end} />
                    </TableCell>
                  </TableRow>
                ))}
                {attendanceData?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                      No active employees found.
                    </TableCell>
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

function AttendanceDetailsDialog({ user, startDate, endDate }: { user: any; startDate: Date; endDate: Date }) {
  const [open, setOpen] = useState(false);
  const startStr = format(startDate, 'MMM d, yyyy');
  const endStr = format(endDate, 'MMM d, yyyy');

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  // Generate day-by-day log
  const timeline = days.map(d => {
    const dStr = format(d, 'yyyy-MM-dd');
    const dayData = user.dayMap?.[dStr];
    return {
      date: d,
      dStr,
      status: dayData?.status || 'absent',
      label: dayData?.label || 'A',
      units: dayData?.units || 0,
      clock_in: dayData?.clock_in,
      clock_out: dayData?.clock_out,
      leaveStatus: dayData?.leaveStatus
    };
  });

  // Sort descending by date (most recent first)
  timeline.sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1 text-slate-600 hover:text-slate-900">
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline">Details</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between pr-6">
            <span>{user.name} - Attendance Log</span>
            <span className="text-sm font-normal px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Total: {user.daysPresent} Days
            </span>
          </DialogTitle>
          <p className="text-sm text-slate-500">{startStr} to {endStr}</p>
        </DialogHeader>

        <div className="flex-1 overflow-auto mt-4 pr-1">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Clock In</TableHead>
                <TableHead>Clock Out</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {timeline.map((t, i) => {
                let badge = <span className="px-2 py-0.5 bg-rose-50 text-rose-600 border border-rose-200 rounded text-xs font-medium">Absent</span>;

                if (t.status === 'present') {
                  badge = <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-xs font-semibold">Present (1.0 Day)</span>;
                } else if (t.status === 'half_day') {
                  badge = <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded text-xs font-semibold">Half Day (0.5 Day)</span>;
                } else if (t.status === 'leave') {
                  badge = <span className="px-2 py-0.5 bg-blue-100 text-blue-800 border border-blue-300 rounded text-xs font-semibold uppercase">Leave ({t.leaveStatus?.replace(/_/g, ' ') || 'PTO'})</span>;
                }

                return (
                  <TableRow key={i}>
                    <TableCell className="font-medium text-slate-900">{format(t.date, 'EEE, MMM d')}</TableCell>
                    <TableCell>{badge}</TableCell>
                    <TableCell className="text-slate-600 font-mono text-xs">
                      {t.clock_in ? format(new Date(t.clock_in), 'HH:mm') : '-'}
                    </TableCell>
                    <TableCell className="text-slate-600 font-mono text-xs">
                      {t.clock_out ? format(new Date(t.clock_out), 'HH:mm') : '-'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
