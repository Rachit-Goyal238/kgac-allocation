import React from 'react';
import { GridFilters } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Download, Calendar as CalendarIcon } from 'lucide-react';
import { format, addWeeks, subWeeks, parseISO } from 'date-fns';
import { getNextWeekRange, getPreviousWeekRange } from '@/lib/utils';
import { LeaveRequestModal } from '@/components/shared/LeaveRequestModal';
import { ExportModal } from '../shared/ExportModal';

interface GridToolbarProps {
  filters: GridFilters;
  onFiltersChange: (filters: GridFilters) => void;
  onExport: (format: 'csv' | 'excel') => void;
}

export function GridToolbar({ filters, onFiltersChange, onExport }: GridToolbarProps) {
  const handleDateChange = (start: Date, end: Date) => {
    onFiltersChange({
      ...filters,
      dateRange: {
        start: format(start, 'yyyy-MM-dd'),
        end: format(end, 'yyyy-MM-dd'),
      },
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
    });
  };

  const currentStart = parseISO(filters.dateRange?.start || new Date().toISOString());

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 bg-white/70 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-10 ring-1 ring-slate-900/5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] rounded-t-xl mx-0">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => {
          const { start, end } = getPreviousWeekRange(currentStart);
          handleDateChange(start, end);
        }}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="flex items-center bg-slate-50 border rounded-md px-3 py-1.5 h-8">
          <CalendarIcon className="mr-2 h-4 w-4 text-slate-500" />
          <span className="text-sm font-medium">
            {format(currentStart, 'MMM d')} - {format(parseISO(filters.dateRange?.end || new Date().toISOString()), 'MMM d, yyyy')}
          </span>
        </div>

        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => {
          const { start, end } = getNextWeekRange(currentStart);
          handleDateChange(start, end);
        }}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        
        <LeaveRequestModal />
      </div>
      
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <input 
          type="text" 
          placeholder="Search employees..." 
          className="border rounded px-3 py-1.5 text-sm flex-grow sm:w-64"
          value={filters.searchQuery || ''}
          onChange={(e) => onFiltersChange({ ...filters, searchQuery: e.target.value })}
        />
      </div>
      
      <div className="flex items-center gap-2">
        <ExportModal />
      </div>
    </div>
  );
}
