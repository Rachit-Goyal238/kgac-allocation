import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Loader2, FileSpreadsheet } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { exportToCSV, exportToExcel } from '@/lib/export';
import { format, parseISO } from 'date-fns';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function ExportModal() {
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-01'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isExporting, setIsExporting] = useState<'csv' | 'excel' | null>(null);
  const { profile } = useAuthContext();
  const isPrivileged = profile?.roles?.some(r => ['admin', 'super_admin', 'manager', 'planner', 'hr'].includes(r));

  const handleExport = async (formatType: 'csv' | 'excel') => {
    setIsExporting(formatType);
    try {
      let query = supabase
        .from('allocations')
        .select(`
          allocation_date,
          hours,
          status,
          notes,
          profiles(full_name, roles, department_id, entity),
          projects(code, name)
        `)
        .gte('allocation_date', startDate)
        .lte('allocation_date', endDate)
        .order('allocation_date', { ascending: true });

      if (!isPrivileged && profile?.id) {
        query = query.eq('user_id', profile.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.info('No attendance records found for the selected date range.');
        return;
      }

      const flatData = data.map((row: any) => ({
        Date: format(parseISO(row.allocation_date), 'dd-MMM-yyyy'),
        Employee: row.profiles?.full_name || 'Unknown',
        Roles: row.profiles?.roles?.join(', ') || '',
        Entity: row.profiles?.entity || '',
        Project_Code: row.projects?.code || '',
        Project_Name: row.projects?.name || '',
        Hours: row.hours,
        Status: row.status,
        Notes: row.notes || ''
      }));

      const filename = `Attendance_Export_${startDate}_to_${endDate}`;

      if (formatType === 'csv') {
        exportToCSV(flatData, `${filename}.csv`);
      } else {
        const columns = [
          { header: 'Date', key: 'Date', width: 16 },
          { header: 'Employee', key: 'Employee', width: 24 },
          { header: 'Roles', key: 'Roles', width: 18 },
          { header: 'Entity', key: 'Entity', width: 12 },
          { header: 'Project Code', key: 'Project_Code', width: 16 },
          { header: 'Project Name', key: 'Project_Name', width: 26 },
          { header: 'Hours', key: 'Hours', width: 12 },
          { header: 'Status', key: 'Status', width: 16 },
          { header: 'Notes', key: 'Notes', width: 30 }
        ];
        await exportToExcel(flatData, columns, `${filename}.xlsx`);
      }

      toast.success(`Successfully exported attendance data to ${formatType.toUpperCase()}`);
      setOpen(false);
    } catch (e: any) {
      console.error('Export failed', e);
      toast.error(`Export failed: ${e.message || 'Unknown error'}`);
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Export Data
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Attendance Data</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Start Date</label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">End Date</label>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-end">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={!!isExporting}>Cancel</Button>
          <Button variant="outline" onClick={() => handleExport('csv')} disabled={!!isExporting} className="gap-1.5">
            {isExporting === 'csv' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export CSV
          </Button>
          <Button onClick={() => handleExport('excel')} disabled={!!isExporting} className="gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white">
            {isExporting === 'excel' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
            Export Excel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
