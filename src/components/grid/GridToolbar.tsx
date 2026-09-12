import React, { useState, useEffect } from 'react';
import { GridFilters } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Download, Calendar as CalendarIcon } from 'lucide-react';
import { format, addWeeks, subWeeks, parseISO } from 'date-fns';
import { getNextWeekRange, getPreviousWeekRange } from '@/lib/utils';
import { LeaveRequestModal } from '@/components/shared/LeaveRequestModal';
import { ExportButton } from '../shared/ExportButton';

interface GridToolbarProps {
  filters: GridFilters;
  onFiltersChange: (filters: GridFilters) => void;
  onExport: (format: 'csv' | 'excel') => void;
}

export function GridToolbar({ filters, onFiltersChange, onExport }: GridToolbarProps) {
  const [searchValue, setSearchValue] = useState(filters.searchQuery || '');

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== filters.searchQuery) {
        onFiltersChange({ ...filters, searchQuery: searchValue });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchValue, filters, onFiltersChange]);

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
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 bg-white border-b sticky top-0 z-20">
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
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
        />
      </div>
      
      <div className="flex items-center gap-2">
        <ExportButton onExport={onExport} />
      </div>
    </div>
  );
}
