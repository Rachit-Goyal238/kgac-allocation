import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Papa from 'papaparse';
import { format, parseISO } from 'date-fns';

export function ExportModal() {
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-01'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (formatType: 'csv' | 'excel') => {
    setIsExporting(true);
    try {
      const { data, error } = await supabase
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

      if (error) throw error;

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

      const csv = Papa.unparse(flatData);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Attendance_Export_${startDate}_to_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setOpen(false);
    } catch (e) {
      console.error('Export failed', e);
    } finally {
      setIsExporting(false);
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
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => handleExport('csv')} disabled={isExporting}>
            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Download CSV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
